//! Native Top-of-Mind workspace. No desktop dependencies: testable without GTK.
use futures_util::future::join_all;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{collections::HashMap, path::PathBuf, sync::Arc, time::Duration};
use tokio::sync::Mutex;
use uuid::Uuid;

fn id() -> String {
    Uuid::new_v4().to_string()
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub name: String,
    pub parent: Option<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Thread {
    pub id: String,
    pub title: String,
    pub folder: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub thread: String,
    pub role: String,
    pub source: String,
    pub content: String,
    pub client_id: Option<String>,
    #[serde(default)]
    pub error: bool,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Source {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub model: String,
    pub base_url: String,
    pub api_key_env: String,
}
impl Source {
    fn available(&self) -> bool {
        self.kind == "echo"
            || self.id == "ollama"
            || std::env::var(&self.api_key_env).is_ok_and(|v| !v.trim().is_empty())
    }
}
fn default_sources() -> Vec<Source> {
    [
        (
            "claude",
            "Claude",
            "anthropic",
            "claude-sonnet-4-5",
            "https://api.anthropic.com/v1",
            "ANTHROPIC_API_KEY",
        ),
        (
            "gpt",
            "OpenAI",
            "openai_compat",
            "gpt-4o",
            "https://api.openai.com/v1",
            "OPENAI_API_KEY",
        ),
        (
            "deepseek",
            "DeepSeek",
            "openai_compat",
            "deepseek-chat",
            "https://api.deepseek.com/v1",
            "DEEPSEEK_API_KEY",
        ),
        (
            "kimi",
            "Kimi",
            "openai_compat",
            "kimi-k2",
            "https://api.moonshot.ai/v1",
            "MOONSHOT_API_KEY",
        ),
        (
            "gemini",
            "Gemini",
            "gemini",
            "gemini-2.5-flash",
            "https://generativelanguage.googleapis.com/v1beta",
            "GEMINI_API_KEY",
        ),
        (
            "ollama",
            "Local Ollama",
            "openai_compat",
            "llama3.1",
            "http://127.0.0.1:11434/v1",
            "OLLAMA_API_KEY",
        ),
        ("echo", "Echo (test lane)", "echo", "", "", ""),
    ]
    .into_iter()
    .map(|(i, n, k, m, b, e)| Source {
        id: i.into(),
        name: n.into(),
        kind: k.into(),
        model: m.into(),
        base_url: b.into(),
        api_key_env: e.into(),
    })
    .collect()
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub name: String,
    pub folder: String,
    pub chunks: Vec<String>,
    pub vectors: Vec<Vec<f32>>,
    pub engine: Option<String>,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Workspace {
    #[serde(default)]
    pub documents: Vec<Document>,
    #[serde(default)]
    pub library: HashMap<String, Value>,
    pub version: u32,
    pub folders: Vec<Folder>,
    pub threads: Vec<Thread>,
    pub messages: Vec<Message>,
    #[serde(default = "default_sources")]
    pub sources: Vec<Source>,
}
impl Default for Workspace {
    fn default() -> Self {
        Self {
            documents: vec![],
            library: HashMap::new(),
            version: 1,
            folders: vec![Folder {
                id: "inbox".into(),
                name: "Inbox".into(),
                parent: None,
            }],
            threads: vec![],
            messages: vec![],
            sources: default_sources(),
        }
    }
}
#[derive(Clone, Serialize)]
struct Job {
    id: String,
    status: String,
    completed: usize,
    total: usize,
}
struct State {
    workspace: Workspace,
    jobs: HashMap<String, Job>,
    aborts: HashMap<String, tokio::task::AbortHandle>,
}
#[derive(Clone)]
pub struct Hub {
    #[cfg(test)]
    test_embedding: Option<(String, String, String)>,
    path: PathBuf,
    _lock: Arc<std::fs::File>,
    state: Arc<Mutex<State>>,
    client: reqwest::Client,
}
impl Hub {
    pub fn open(path: PathBuf) -> Result<Self, String> {
        use fs2::FileExt;
        let parent = path.parent().ok_or("Invalid workspace path")?;
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        let lock = std::fs::OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(path.with_extension("lock"))
            .map_err(|e| e.to_string())?;
        lock.try_lock_exclusive()
            .map_err(|_| "Another backend is already using this workspace")?;
        let workspace = match std::fs::read(&path) {
            Ok(bytes) => {
                serde_json::from_slice(&bytes).map_err(|e| format!("Cannot read workspace: {e}"))?
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Workspace::default(),
            Err(e) => return Err(format!("Cannot open workspace: {e}")),
        };
        validate_workspace(&workspace)?;
        let client = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .timeout(Duration::from_secs(90))
            .connect_timeout(Duration::from_secs(15))
            .build()
            .map_err(|e| e.to_string())?;
        Ok(Self {
            #[cfg(test)]
            test_embedding: None,
            path,
            _lock: Arc::new(lock),
            state: Arc::new(Mutex::new(State {
                workspace,
                jobs: HashMap::new(),
                aborts: HashMap::new(),
            })),
            client,
        })
    }
    fn save(&self, w: &Workspace) -> Result<(), String> {
        let parent = self.path.parent().ok_or("Invalid workspace path")?;
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        let tmp = parent.join(format!(".workspace-{}.tmp", id()));
        let bytes = serde_json::to_vec_pretty(w).map_err(|e| e.to_string())?;
        use std::io::Write;
        let mut file = std::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&tmp)
            .map_err(|e| e.to_string())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            file.set_permissions(std::fs::Permissions::from_mode(0o600))
                .map_err(|e| e.to_string())?;
        }
        file.write_all(&bytes)
            .and_then(|_| file.sync_all())
            .map_err(|e| e.to_string())?;
        std::fs::rename(&tmp, &self.path).map_err(|e| e.to_string())
    }
    pub async fn request(&self, method: &str, path: &str, body: Value) -> Result<Value, String> {
        if method == "POST" && path == "/knowledge/index" {
            return self.index_document(body).await;
        }
        if method == "POST" && path == "/knowledge/search" {
            return self.search_documents(body).await;
        }
        let path = path.split('?').next().unwrap_or(path);
        let mut state = self.state.lock().await;
        match (method, path) {
            ("GET", "/knowledge") => Ok(
                json!({"documents":state.workspace.documents.iter().map(|d|json!({"id":d.id,"name":d.name,"folder":d.folder,"chunks":d.chunks.len(),"indexed":!d.vectors.is_empty()})).collect::<Vec<_>>(),"embeddings_configured":embedding_config().is_ok()}),
            ),
            ("GET", "/library") => Ok(json!(state.workspace.library)),
            ("POST", "/library") => {
                let key = text(&body, "key")?;
                if !["notes", "prompts", "agents"].contains(&key.as_str()) {
                    return Err("Unknown library".into());
                }
                let mut next = state.workspace.clone();
                next.library.insert(key, body["value"].clone());
                self.save(&next)?;
                state.workspace = next;
                Ok(json!({"status":"saved"}))
            }
            ("POST", "/import") => {
                let incoming: Workspace =
                    serde_json::from_value(body).map_err(|_| "Invalid workspace archive")?;
                validate_workspace(&incoming)?;
                let mut next = state.workspace.clone();
                for folder in incoming.folders {
                    if let Some(old) = next.folders.iter().find(|f| f.id == folder.id) {
                        if serde_json::to_value(old).unwrap()
                            != serde_json::to_value(&folder).unwrap()
                        {
                            return Err("Import folder ID conflicts with existing data".into());
                        }
                    } else {
                        next.folders.push(folder)
                    }
                }
                for thread in incoming.threads {
                    if let Some(old) = next.threads.iter().find(|t| t.id == thread.id) {
                        if serde_json::to_value(old).unwrap()
                            != serde_json::to_value(&thread).unwrap()
                        {
                            return Err("Import thread ID conflicts with existing data".into());
                        }
                    } else {
                        next.threads.push(thread)
                    }
                }
                for message in incoming.messages {
                    if let Some(old) = next.messages.iter().find(|m| m.id == message.id) {
                        if serde_json::to_value(old).unwrap()
                            != serde_json::to_value(&message).unwrap()
                        {
                            return Err("Import message ID conflicts with existing data".into());
                        }
                    } else {
                        next.messages.push(message)
                    }
                }
                for document in incoming.documents {
                    if !next.documents.iter().any(|d| d.id == document.id) {
                        next.documents.push(document)
                    }
                }
                for (key, value) in incoming.library {
                    if let Some(old) = next.library.get_mut(&key) {
                        if let (Some(old), Some(new)) = (old.as_array_mut(), value.as_array()) {
                            for entry in new {
                                if !old.contains(entry) {
                                    old.push(entry.clone())
                                }
                            }
                        }
                    } else {
                        next.library.insert(key, value);
                    }
                }
                // Provider settings are deliberately retained from this installation.
                validate_workspace(&next)?;
                self.save(&next)?;
                state.workspace = next;
                Ok(json!({"status":"imported"}))
            }
            ("GET", "/export") => Ok(json!(state.workspace)),
            ("GET", "/providers") => Ok(json!(state.workspace.sources)),
            ("POST", "/providers") => {
                let source: Source =
                    serde_json::from_value(body).map_err(|_| "Invalid provider settings")?;
                if source.id == "echo"
                    || source.model.trim().is_empty()
                    || source.name.trim().is_empty()
                {
                    return Err("Provider name and model are required; echo is reserved".into());
                }
                let url =
                    reqwest::Url::parse(&source.base_url).map_err(|_| "Invalid provider URL")?;
                if url.scheme() != "https"
                    && !(url.scheme() == "http"
                        && matches!(url.host_str(), Some("127.0.0.1" | "localhost")))
                {
                    return Err("Use HTTPS or a local HTTP endpoint".into());
                }
                if !url.username().is_empty()
                    || url.password().is_some()
                    || url.query().is_some()
                    || url.fragment().is_some()
                {
                    return Err(
                        "Provider URLs cannot contain credentials, queries or fragments".into(),
                    );
                }
                if !["anthropic", "openai_compat", "gemini"].contains(&source.kind.as_str()) {
                    return Err("Unknown provider type".into());
                }
                if source.api_key_env.is_empty()
                    || !source
                        .api_key_env
                        .bytes()
                        .all(|c| c.is_ascii_alphanumeric() || c == b'_')
                {
                    return Err("Use an environment variable name for the API key".into());
                }
                let mut next = state.workspace.clone();
                if let Some(old) = next.sources.iter_mut().find(|s| s.id == source.id) {
                    *old = source
                } else {
                    next.sources.push(source)
                }
                self.save(&next)?;
                state.workspace = next;
                Ok(json!({"status":"saved"}))
            }
            ("GET", "/health") => Ok(json!({"status":"ok","backend":"rust"})),
            ("GET", "/top-of-mind/sources") => Ok(
                json!({"sources":state.workspace.sources.iter().map(|s|json!({"id":s.id,"name":s.name,"model":s.model,"status":if s.available(){"online"}else{"offline"}})).collect::<Vec<_>>()}),
            ),
            ("GET", "/workspace") => Ok(
                json!({"folders":state.workspace.folders,"threads":state.workspace.threads,"jobs":state.jobs}),
            ),
            ("POST", "/folders/update") => {
                let folder_id = text(&body, "id")?;
                let mut next = state.workspace.clone();
                let folder = next
                    .folders
                    .iter_mut()
                    .find(|f| f.id == folder_id)
                    .ok_or("Folder does not exist")?;
                if body.get("name").is_some() {
                    folder.name = text(&body, "name")?;
                }
                if body.get("parent").is_some() {
                    folder.parent = body["parent"].as_str().map(str::to_owned);
                }
                validate_workspace(&next)?;
                self.save(&next)?;
                state.workspace = next;
                Ok(json!({"status":"saved"}))
            }
            ("POST", "/threads/update") => {
                let thread_id = text(&body, "id")?;
                let mut next = state.workspace.clone();
                let thread = next
                    .threads
                    .iter_mut()
                    .find(|t| t.id == thread_id)
                    .ok_or("Conversation does not exist")?;
                if body.get("title").is_some() {
                    thread.title = text(&body, "title")?;
                }
                if body.get("folder").is_some() {
                    thread.folder = text(&body, "folder")?;
                }
                validate_workspace(&next)?;
                self.save(&next)?;
                state.workspace = next;
                Ok(json!({"status":"saved"}))
            }
            ("POST", "/folders") => {
                let name = text(&body, "name")?;
                let parent = body["parent"].as_str().map(str::to_owned);
                if let Some(p) = &parent {
                    if !state.workspace.folders.iter().any(|f| &f.id == p) {
                        return Err("Parent folder does not exist".into());
                    }
                }
                let folder = Folder {
                    id: id(),
                    name,
                    parent,
                };
                let mut next = state.workspace.clone();
                next.folders.push(folder.clone());
                self.save(&next)?;
                state.workspace = next;
                Ok(json!(folder))
            }
            ("POST", "/threads") => {
                let folder = text(&body, "folder")?;
                if !state.workspace.folders.iter().any(|f| f.id == folder) {
                    return Err("Folder does not exist".into());
                }
                let thread = Thread {
                    id: id(),
                    title: body["title"]
                        .as_str()
                        .filter(|s| !s.trim().is_empty())
                        .unwrap_or("New conversation")
                        .into(),
                    folder,
                };
                let mut next = state.workspace.clone();
                next.threads.push(thread.clone());
                self.save(&next)?;
                state.workspace = next;
                Ok(json!(thread))
            }
            ("GET", "/top-of-mind/messages") => {
                let thread = text(&body, "thread")?;
                Ok(
                    json!({"messages":state.workspace.messages.iter().filter(|m|m.thread==thread).collect::<Vec<_>>(),"job":state.jobs.get(&thread)}),
                )
            }
            ("POST", "/top-of-mind/controls/end-all") => {
                for (_, handle) in state.aborts.drain() {
                    handle.abort();
                }
                for job in state.jobs.values_mut().filter(|j| j.status == "running") {
                    job.status = "stopped".into();
                }
                Ok(json!({"status":"stopped"}))
            }
            ("POST", "/top-of-mind/messages") => {
                let thread = text(&body, "thread")?;
                let content = text(&body, "body")?;
                if !state.workspace.threads.iter().any(|t| t.id == thread) {
                    return Err("Conversation does not exist".into());
                }
                let client_id = body["client_id"].as_str().map(str::to_owned);
                if let Some(c) = &client_id {
                    if let Some(m) = state
                        .workspace
                        .messages
                        .iter()
                        .find(|m| m.thread == thread && m.client_id.as_ref() == Some(c))
                    {
                        return Ok(json!(m));
                    }
                }
                if state
                    .jobs
                    .get(&thread)
                    .is_some_and(|j| j.status == "running")
                {
                    return Err("Wait for the current replies or stop them first".into());
                }
                let mode = body["mode"].as_str().unwrap_or("once");
                if !["once", "turns", "discuss"].contains(&mode) {
                    return Err("Unknown conversation mode".into());
                }
                let rounds = if mode == "discuss" {
                    body["rounds"].as_u64().unwrap_or(2)
                } else {
                    1
                };
                if !(1..=5).contains(&rounds) {
                    return Err("Choose between 1 and 5 discussion rounds".into());
                }
                let ids = body["sources"].as_array().ok_or("Select at least one AI")?;
                if ids.is_empty() || ids.len() > 6 {
                    return Err("Select between one and six AIs".into());
                }
                let mut selected = Vec::new();
                for v in ids {
                    let source = state
                        .workspace
                        .sources
                        .iter()
                        .find(|s| Some(s.id.as_str()) == v.as_str())
                        .ok_or("Unknown AI")?
                        .clone();
                    if !source.available() {
                        return Err(format!(
                            "{} is offline; configure {}",
                            source.name, source.api_key_env
                        ));
                    }
                    if selected.iter().any(|s: &Source| s.id == source.id) {
                        return Err("Choose each AI only once".into());
                    }
                    selected.push(source);
                }
                let message = Message {
                    id: id(),
                    thread: thread.clone(),
                    role: "user".into(),
                    source: "User".into(),
                    content,
                    client_id,
                    error: false,
                };
                let mut next = state.workspace.clone();
                if let Some(t) = next.threads.iter_mut().find(|t| t.id == thread) {
                    if t.title == "New conversation" {
                        t.title = message.content.chars().take(60).collect();
                    }
                }
                next.messages.push(message.clone());
                self.save(&next)?;
                state.workspace = next;
                let job = Job {
                    id: id(),
                    status: "running".into(),
                    completed: 0,
                    total: selected.len() * rounds as usize,
                };
                state.jobs.insert(thread.clone(), job.clone());
                let hub = self.clone();
                let mode = mode.to_string();
                let handle = tokio::spawn(async move {
                    hub.generate(thread, selected, mode, rounds, job.id).await;
                });
                state
                    .aborts
                    .insert(message.thread.clone(), handle.abort_handle());
                Ok(json!(message))
            }
            _ => Err("This operation has not been migrated to the Rust backend yet".into()),
        }
    }
    async fn embedding(&self, texts: &[String]) -> Result<(String, Vec<Vec<f32>>), String> {
        #[cfg(test)]
        let (url, model, key) = self
            .test_embedding
            .clone()
            .map(Ok)
            .unwrap_or_else(embedding_config)?;
        #[cfg(not(test))]
        let (url, model, key) = embedding_config()?;
        let response = self
            .client
            .post(&url)
            .bearer_auth(key)
            .json(&json!({"model":model,"input":texts}))
            .send()
            .await
            .map_err(|_| "Embedding service could not be reached")?;
        if !response.status().is_success() {
            return Err(format!(
                "Embedding service returned HTTP {}",
                response.status().as_u16()
            ));
        }
        let body: Value = response
            .json()
            .await
            .map_err(|_| "Invalid embedding response")?;
        let rows = body["data"]
            .as_array()
            .ok_or("Embedding response has no data")?;
        if rows.len() != texts.len() {
            return Err("Embedding response count mismatch".into());
        }
        let mut vectors = vec![Vec::new(); texts.len()];
        for row in rows {
            let i = row["index"].as_u64().ok_or("Missing embedding index")? as usize;
            if i >= vectors.len() || !vectors[i].is_empty() {
                return Err("Invalid embedding index".into());
            }
            let vector: Vec<f32> =
                serde_json::from_value(row["embedding"].clone()).map_err(|_| "Invalid vector")?;
            if vector.is_empty()
                || vector.iter().any(|v| !v.is_finite())
                || vector.iter().map(|v| v * v).sum::<f32>() <= 0.0
            {
                return Err("Invalid embedding vector".into());
            }
            vectors[i] = vector;
        }
        if vectors.iter().any(|v| v.len() != vectors[0].len()) {
            return Err("Inconsistent vector dimensions".into());
        }
        Ok((format!("{url}|{model}"), vectors))
    }
    async fn index_document(&self, body: Value) -> Result<Value, String> {
        let folder = text(&body, "folder")?;
        let name = text(&body, "name")?;
        let content = text(&body, "content")?;
        if content.len() > 200_000 {
            return Err("Import text documents smaller than 200 KB at a time".into());
        }
        {
            let state = self.state.lock().await;
            if !state.workspace.folders.iter().any(|f| f.id == folder) {
                return Err("Folder does not exist".into());
            }
        }
        let chars: Vec<char> = content.chars().collect();
        let chunks: Vec<String> = (0..chars.len())
            .step_by(1000)
            .map(|start| {
                chars[start..(start + 1200).min(chars.len())]
                    .iter()
                    .collect()
            })
            .collect();
        let (engine, vectors) = if body["vectorize"].as_bool().unwrap_or(false) {
            let (e, v) = self.embedding(&chunks).await?;
            (Some(e), v)
        } else {
            (None, vec![])
        };
        let document = Document {
            id: id(),
            name,
            folder,
            chunks,
            vectors,
            engine,
        };
        let result = json!({"id":document.id,"chunks":document.chunks.len(),"indexed":!document.vectors.is_empty()});
        let mut state = self.state.lock().await;
        let mut next = state.workspace.clone();
        next.documents.push(document);
        self.save(&next)?;
        state.workspace = next;
        Ok(result)
    }
    async fn search_documents(&self, body: Value) -> Result<Value, String> {
        let folder = text(&body, "folder")?;
        let query = text(&body, "query")?;
        let documents: Vec<Document> = self
            .state
            .lock()
            .await
            .workspace
            .documents
            .iter()
            .filter(|d| d.folder == folder)
            .cloned()
            .collect();
        let semantic = body["semantic"].as_bool().unwrap_or(false);
        let embedding = if semantic {
            Some(self.embedding(std::slice::from_ref(&query)).await?)
        } else {
            None
        };
        let mut results = Vec::new();
        for doc in documents {
            for (index, chunk) in doc.chunks.iter().enumerate() {
                let score = if let Some((engine, query_vectors)) = &embedding {
                    if doc.engine.as_ref() != Some(engine) {
                        continue;
                    }
                    let Some(vector) = doc.vectors.get(index) else {
                        continue;
                    };
                    let q = &query_vectors[0];
                    if vector.len() != q.len() {
                        continue;
                    }
                    let dot: f32 = vector.iter().zip(q).map(|(a, b)| a * b).sum();
                    let norm = vector.iter().map(|v| v * v).sum::<f32>().sqrt()
                        * q.iter().map(|v| v * v).sum::<f32>().sqrt();
                    dot / norm
                } else {
                    let lower = chunk.to_lowercase();
                    query
                        .split_whitespace()
                        .filter(|word| lower.contains(&word.to_lowercase()))
                        .count() as f32
                };
                if semantic || score > 0.0 {
                    results.push(json!({"document":doc.id,"source":doc.name,"chunk":index+1,"text":chunk,"score":score}));
                }
            }
        }
        results.sort_by(|a, b| {
            b["score"]
                .as_f64()
                .partial_cmp(&a["score"].as_f64())
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        results.truncate(5);
        Ok(json!({"results":results,"mode":if semantic{"semantic"}else{"keyword"}}))
    }
    async fn active(&self, thread: &str, job_id: &str) -> bool {
        self.state
            .lock()
            .await
            .jobs
            .get(thread)
            .is_some_and(|j| j.id == job_id && j.status == "running")
    }
    async fn snapshot(&self, thread: &str) -> Vec<Message> {
        self.state
            .lock()
            .await
            .workspace
            .messages
            .iter()
            .filter(|m| m.thread == thread && !m.error)
            .cloned()
            .collect()
    }
    async fn append_reply(
        &self,
        thread: &str,
        job_id: &str,
        source: &Source,
        result: Result<String, String>,
    ) {
        let mut state = self.state.lock().await;
        if !state
            .jobs
            .get(thread)
            .is_some_and(|j| j.id == job_id && j.status == "running")
        {
            return;
        }
        let error = result.is_err();
        let content = result.unwrap_or_else(|e| e);
        let mut next = state.workspace.clone();
        next.messages.push(Message {
            id: id(),
            thread: thread.into(),
            role: "assistant".into(),
            source: source.id.clone(),
            content,
            client_id: None,
            error,
        });
        if self.save(&next).is_err() {
            if let Some(j) = state.jobs.get_mut(thread) {
                j.status = "storage-error".into()
            }
            return;
        }
        state.workspace = next;
        if let Some(j) = state.jobs.get_mut(thread) {
            j.completed += 1;
        }
    }
    async fn generate(
        &self,
        thread: String,
        sources: Vec<Source>,
        mode: String,
        rounds: u64,
        job_id: String,
    ) {
        if mode == "once" {
            let snapshot = self.snapshot(&thread).await;
            join_all(sources.iter().map(|source| async {
                if !self.active(&thread, &job_id).await {
                    return;
                }
                let result = self.reply(source, &snapshot).await;
                self.append_reply(&thread, &job_id, source, result).await;
            }))
            .await;
        } else {
            for _ in 0..rounds {
                for source in &sources {
                    if !self.active(&thread, &job_id).await {
                        return;
                    }
                    let snapshot = self.snapshot(&thread).await;
                    let result = self.reply(source, &snapshot).await;
                    self.append_reply(&thread, &job_id, source, result).await;
                }
            }
        }
        let mut state = self.state.lock().await;
        if let Some(j) = state.jobs.get_mut(&thread) {
            if j.id == job_id && j.status == "running" {
                j.status = "completed".into();
            }
        }
    }
    async fn reply(&self, source: &Source, messages: &[Message]) -> Result<String, String> {
        if source.kind == "echo" {
            return Ok(format!(
                "Echo received {} shared messages. Latest: {}",
                messages.len(),
                messages.last().map(|m| m.content.as_str()).unwrap_or("")
            ));
        }
        let mut context = provider_context(messages, &source.id);
        if context.last().is_some_and(|m| m["role"] == "assistant") {
            context.push(json!({"role":"user","content":"It is your turn in this shared discussion. Respond to the conversation above; add evidence, corrections, or unresolved questions."}));
        }
        let key = std::env::var(&source.api_key_env).unwrap_or_default();
        let base = source.base_url.trim_end_matches('/');
        let request=match source.kind.as_str() {
            "openai_compat" => {
                let r=self.client.post(format!("{base}/chat/completions")).json(&json!({"model":source.model,"messages":context,"max_tokens":2048}));
                if key.is_empty(){r}else{r.bearer_auth(&key)}
            },
            "anthropic" => self.client.post(format!("{base}/messages")).header("x-api-key",&key).header("anthropic-version","2023-06-01").json(&json!({"model":source.model,"max_tokens":2048,"messages":context})),
            "gemini" => self.client.post(format!("{base}/models/{}:generateContent",source.model)).header("x-goog-api-key",&key).json(&json!({"contents":context.iter().map(|m|json!({"role":if m["role"]=="assistant"{"model"}else{"user"},"parts":[{"text":m["content"]}]})).collect::<Vec<_>>(),"generationConfig":{"maxOutputTokens":2048}})),
            _ => return Err("Unsupported provider".into()),
        };
        // Never surface provider bodies or request errors containing URLs/credentials.
        let response = request
            .send()
            .await
            .map_err(|_| format!("{} could not be reached", source.name))?;
        if !response.status().is_success() {
            return Err(format!(
                "{} returned HTTP {}",
                source.name,
                response.status().as_u16()
            ));
        }
        let value: Value = response
            .json()
            .await
            .map_err(|_| "Provider returned invalid JSON")?;
        let result = match source.kind.as_str() {
            "anthropic" => value["content"].as_array().map(|a| {
                a.iter()
                    .filter_map(|b| b["text"].as_str())
                    .collect::<Vec<_>>()
                    .join("\n")
            }),
            "gemini" => value["candidates"][0]["content"]["parts"]
                .as_array()
                .map(|a| {
                    a.iter()
                        .filter_map(|b| b["text"].as_str())
                        .collect::<Vec<_>>()
                        .join("\n")
                }),
            _ => value["choices"][0]["message"]["content"]
                .as_str()
                .map(str::to_owned),
        };
        result
            .filter(|s| !s.trim().is_empty())
            .ok_or("Provider returned no text".into())
    }
}
fn validate_workspace(w: &Workspace) -> Result<(), String> {
    if w.version != 1 {
        return Err("Unsupported archive version".into());
    }
    use std::collections::HashSet;
    let folders: HashSet<_> = w.folders.iter().map(|f| f.id.as_str()).collect();
    let threads: HashSet<_> = w.threads.iter().map(|t| t.id.as_str()).collect();
    if folders.len() != w.folders.len()
        || threads.len() != w.threads.len()
        || w.messages
            .iter()
            .map(|m| &m.id)
            .collect::<HashSet<_>>()
            .len()
            != w.messages.len()
        || w.documents
            .iter()
            .map(|d| &d.id)
            .collect::<HashSet<_>>()
            .len()
            != w.documents.len()
    {
        return Err("Duplicate IDs in archive".into());
    }
    for folder in &w.folders {
        if folder.id.is_empty() || folder.name.trim().is_empty() {
            return Err("Invalid folder".into());
        }
        let mut seen = HashSet::new();
        let mut current = Some(folder.id.as_str());
        while let Some(id) = current {
            if !seen.insert(id) {
                return Err("Folder cycle in archive".into());
            }
            let node = w
                .folders
                .iter()
                .find(|f| f.id == id)
                .ok_or("Missing parent folder")?;
            current = node.parent.as_deref();
        }
    }
    if w.threads
        .iter()
        .any(|t| t.id.is_empty() || !folders.contains(t.folder.as_str()))
        || w.messages.iter().any(|m| {
            m.id.is_empty()
                || !threads.contains(m.thread.as_str())
                || !["user", "assistant"].contains(&m.role.as_str())
        })
        || w.documents
            .iter()
            .any(|d| !folders.contains(d.folder.as_str()))
    {
        return Err("Archive contains orphaned or invalid records".into());
    }
    for d in &w.documents {
        if !d.vectors.is_empty()
            && (d.vectors.len() != d.chunks.len()
                || d.engine.is_none()
                || d.vectors.iter().any(|v| {
                    v.is_empty()
                        || v.len() != d.vectors[0].len()
                        || v.iter().any(|x| !x.is_finite())
                        || v.iter().map(|x| x * x).sum::<f32>() <= 0.0
                }))
        {
            return Err("Archive contains invalid document vectors".into());
        }
    }
    Ok(())
}
fn embedding_config() -> Result<(String, String, String), String> {
    let url = std::env::var("TOM_EMBEDDING_URL")
        .unwrap_or_else(|_| "https://api.openai.com/v1/embeddings".into());
    let parsed = reqwest::Url::parse(&url).map_err(|_| "Invalid embedding endpoint")?;
    if parsed.scheme() != "https"
        && !(parsed.scheme() == "http"
            && matches!(parsed.host_str(), Some("localhost" | "127.0.0.1")))
    {
        return Err("Embedding endpoint must use HTTPS or local HTTP".into());
    }
    if !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.query().is_some()
        || parsed.fragment().is_some()
    {
        return Err("Embedding URL cannot contain credentials or query parameters".into());
    }
    let model =
        std::env::var("TOM_EMBEDDING_MODEL").unwrap_or_else(|_| "text-embedding-3-small".into());
    let env = std::env::var("TOM_EMBEDDING_KEY_ENV").unwrap_or_else(|_| "OPENAI_API_KEY".into());
    let key = std::env::var(env)
        .ok()
        .filter(|v| !v.trim().is_empty())
        .ok_or("Configure the embedding API key on the backend first")?;
    Ok((url, model, key))
}
fn text(v: &Value, key: &str) -> Result<String, String> {
    v[key]
        .as_str()
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.trim().to_owned())
        .ok_or_else(|| format!("{key} is required"))
}
/// Other participants are attributed input, never impersonated as this model's output.
/// Adjacent roles are merged for providers that require alternating messages.
pub fn provider_context(messages: &[Message], actor: &str) -> Vec<Value> {
    let mut out: Vec<Value> = Vec::new();
    for m in messages.iter().filter(|m| !m.error) {
        let role = if m.role == "assistant" && m.source == actor {
            "assistant"
        } else {
            "user"
        };
        let content = if m.role == "assistant" && m.source != actor {
            format!("[{} said]\n{}", m.source, m.content)
        } else {
            m.content.clone()
        };
        if let Some(last) = out.last_mut().filter(|v| v["role"] == role) {
            let previous = last["content"].as_str().unwrap_or_default();
            last["content"] = json!(format!("{previous}\n\n{content}"));
        } else {
            out.push(json!({"role":role,"content":content}));
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    fn message(thread: &str, role: &str, source: &str, content: &str) -> Message {
        Message {
            id: id(),
            thread: thread.into(),
            role: role.into(),
            source: source.into(),
            content: content.into(),
            client_id: None,
            error: false,
        }
    }
    async fn fixture() -> (tempfile::TempDir, Hub, String) {
        let dir = tempfile::tempdir().unwrap();
        let hub = Hub::open(dir.path().join("workspace.json")).unwrap();
        {
            let mut state = hub.state.lock().await;
            let mut other = state
                .workspace
                .sources
                .iter()
                .find(|s| s.id == "echo")
                .unwrap()
                .clone();
            other.id = "reviewer".into();
            other.name = "Reviewer".into();
            state.workspace.sources.push(other);
        }
        let thread = hub
            .request("POST", "/threads", json!({"folder":"inbox"}))
            .await
            .unwrap()["id"]
            .as_str()
            .unwrap()
            .to_owned();
        (dir, hub, thread)
    }
    async fn wait(hub: &Hub, thread: &str) -> Value {
        tokio::time::timeout(Duration::from_secs(3), async {
            loop {
                let d = hub
                    .request("GET", "/top-of-mind/messages", json!({"thread":thread}))
                    .await
                    .unwrap();
                if d["job"]["status"] != "running" {
                    return d;
                }
                tokio::time::sleep(Duration::from_millis(5)).await;
            }
        })
        .await
        .unwrap()
    }
    #[test]
    fn context_attributes_other_ais_and_merges_roles() {
        let messages = vec![
            message("t", "user", "User", "Question"),
            message("t", "assistant", "claude", "First answer"),
            message("t", "assistant", "gpt", "Review"),
        ];
        let context = provider_context(&messages, "gpt");
        assert_eq!(context.len(), 2);
        assert_eq!(context[0]["role"], "user");
        assert!(context[0]["content"]
            .as_str()
            .unwrap()
            .contains("[claude said]\nFirst answer"));
        assert_eq!(context[1]["role"], "assistant");
        assert_eq!(context[1]["content"], "Review");
    }
    #[tokio::test]
    async fn nested_folders_and_thread_survive_restart() {
        let (dir, hub, thread) = fixture().await;
        let parent = hub
            .request(
                "POST",
                "/folders",
                json!({"name":"Research","parent":"inbox"}),
            )
            .await
            .unwrap();
        hub.request(
            "POST",
            "/folders",
            json!({"name":"Physics","parent":parent["id"]}),
        )
        .await
        .unwrap();
        assert!(hub
            .request(
                "POST",
                "/folders",
                json!({"name":"Orphan","parent":"missing"})
            )
            .await
            .is_err());
        assert!(Hub::open(dir.path().join("workspace.json")).is_err());
        drop(hub);
        let reopened = Hub::open(dir.path().join("workspace.json")).unwrap();
        let w = reopened
            .request("GET", "/workspace", Value::Null)
            .await
            .unwrap();
        assert_eq!(w["folders"].as_array().unwrap().len(), 3);
        assert_eq!(w["threads"][0]["id"], thread);
    }
    #[tokio::test]
    async fn ask_once_uses_same_snapshot_and_is_idempotent() {
        let (_dir, hub, thread) = fixture().await;
        let body = json!({"thread":thread,"body":"Shared question","sources":["echo","reviewer"],"client_id":"same","mode":"once"});
        let first = hub
            .request("POST", "/top-of-mind/messages", body.clone())
            .await
            .unwrap();
        assert_eq!(
            first,
            hub.request("POST", "/top-of-mind/messages", body)
                .await
                .unwrap()
        );
        let d = wait(&hub, &thread).await;
        let m = d["messages"].as_array().unwrap();
        assert_eq!(m.len(), 3);
        assert!(m[1..]
            .iter()
            .all(|m| m["content"].as_str().unwrap().contains("1 shared messages")));
        assert_eq!(d["job"]["completed"], 2);
    }
    #[tokio::test]
    async fn discussion_includes_previous_replies_and_stops_at_limit() {
        let (_dir, hub, thread) = fixture().await;
        hub.request("POST","/top-of-mind/messages",json!({"thread":thread,"body":"Question","sources":["echo","reviewer"],"mode":"discuss","rounds":2})).await.unwrap();
        let d = wait(&hub, &thread).await;
        let m = d["messages"].as_array().unwrap();
        assert_eq!(m.len(), 5);
        for (n, message) in m.iter().enumerate().skip(1) {
            assert!(message["content"]
                .as_str()
                .unwrap()
                .contains(&format!("{n} shared messages")));
        }
        assert_eq!(d["job"]["total"], 4);
        assert_eq!(d["job"]["status"], "completed");
    }
    #[tokio::test]
    async fn context_is_isolated_by_thread() {
        let (_dir, hub, thread) = fixture().await;
        hub.request(
            "POST",
            "/top-of-mind/messages",
            json!({"thread":thread,"body":"Private first thread","sources":["echo"]}),
        )
        .await
        .unwrap();
        wait(&hub, &thread).await;
        let second = hub
            .request("POST", "/threads", json!({"folder":"inbox"}))
            .await
            .unwrap()["id"]
            .as_str()
            .unwrap()
            .to_owned();
        hub.request(
            "POST",
            "/top-of-mind/messages",
            json!({"thread":second,"body":"Other thread","sources":["echo"]}),
        )
        .await
        .unwrap();
        let d = wait(&hub, &second).await;
        assert_eq!(d["messages"].as_array().unwrap().len(), 2);
        assert!(!d["messages"][1]["content"]
            .as_str()
            .unwrap()
            .contains("Private first thread"));
    }
    #[tokio::test]
    async fn invalid_routing_never_persists_user_message() {
        let (_dir, hub, thread) = fixture().await;
        for extra in [
            json!({"sources":[]}),
            json!({"sources":["missing"]}),
            json!({"sources":["echo","echo"]}),
            json!({"sources":["echo"],"mode":"discuss","rounds":6}),
        ] {
            let mut body = json!({"thread":thread,"body":"Invalid"});
            body.as_object_mut()
                .unwrap()
                .extend(extra.as_object().unwrap().clone());
            assert!(hub
                .request("POST", "/top-of-mind/messages", body)
                .await
                .is_err());
        }
        let d = hub
            .request("GET", "/top-of-mind/messages", json!({"thread":thread}))
            .await
            .unwrap();
        assert!(d["messages"].as_array().unwrap().is_empty());
    }
    #[tokio::test]
    async fn stop_preserves_history_and_discards_late_reply() {
        let (_dir, hub, thread) = fixture().await;
        {
            let mut state = hub.state.lock().await;
            state.jobs.insert(
                thread.clone(),
                Job {
                    id: "old".into(),
                    status: "running".into(),
                    completed: 0,
                    total: 1,
                },
            );
            state
                .workspace
                .messages
                .push(message(&thread, "user", "User", "Keep me"));
        }
        hub.request("POST", "/top-of-mind/controls/end-all", Value::Null)
            .await
            .unwrap();
        let source = default_sources().pop().unwrap();
        hub.append_reply(&thread, "old", &source, Ok("Late response".into()))
            .await;
        let d = hub
            .request("GET", "/top-of-mind/messages", json!({"thread":thread}))
            .await
            .unwrap();
        assert_eq!(d["messages"].as_array().unwrap().len(), 1);
        assert_eq!(d["job"]["status"], "stopped");
    }
}

#[cfg(test)]
mod migration_tests {
    use super::*;
    #[tokio::test]
    async fn import_is_additive_idempotent_and_rejects_cycles() {
        let dir = tempfile::tempdir().unwrap();
        let hub = Hub::open(dir.path().join("workspace.json")).unwrap();
        hub.request(
            "POST",
            "/threads",
            json!({"folder":"inbox","title":"Existing"}),
        )
        .await
        .unwrap();
        let archive = json!({"version":1,"folders":[{"id":"imported","name":"Imported","parent":null}],"threads":[{"id":"old-thread","title":"Legacy","folder":"imported"}],"messages":[{"id":"old-message","thread":"old-thread","role":"user","source":"User","content":"Preserve this","client_id":null}],"sources":[],"library":{"notes":[{"id":"old-note","title":"Note","content":"Keep note"}]}});
        for _ in 0..2 {
            hub.request("POST", "/import", archive.clone())
                .await
                .unwrap();
        }
        let saved = hub.request("GET", "/export", Value::Null).await.unwrap();
        assert_eq!(saved["threads"].as_array().unwrap().len(), 2);
        assert_eq!(saved["messages"].as_array().unwrap().len(), 1);
        assert_eq!(saved["library"]["notes"].as_array().unwrap().len(), 1);
        let invalid = json!({"version":1,"folders":[{"id":"loop","name":"Cycle","parent":"loop"}],"threads":[],"messages":[]});
        assert!(hub.request("POST", "/import", invalid).await.is_err());
        assert_eq!(
            saved,
            hub.request("GET", "/export", Value::Null).await.unwrap()
        );
    }
    #[tokio::test]
    async fn document_search_is_folder_scoped_and_persists() {
        let dir = tempfile::tempdir().unwrap();
        let hub = Hub::open(dir.path().join("workspace.json")).unwrap();
        let other = hub
            .request("POST", "/folders", json!({"name":"Other"}))
            .await
            .unwrap();
        hub.request("POST","/knowledge/index",json!({"folder":"inbox","name":"Evidence.md","content":"Calibration is forty two","vectorize":false})).await.unwrap();
        let result = hub
            .request(
                "POST",
                "/knowledge/search",
                json!({"folder":"inbox","query":"calibration","semantic":false}),
            )
            .await
            .unwrap();
        assert_eq!(result["results"][0]["source"], "Evidence.md");
        assert_eq!(result["mode"], "keyword");
        let empty = hub
            .request(
                "POST",
                "/knowledge/search",
                json!({"folder":other["id"],"query":"calibration","semantic":false}),
            )
            .await
            .unwrap();
        assert!(empty["results"].as_array().unwrap().is_empty());
        drop(hub);
        let reopened = Hub::open(dir.path().join("workspace.json")).unwrap();
        let knowledge = reopened
            .request("GET", "/knowledge", Value::Null)
            .await
            .unwrap();
        assert_eq!(knowledge["documents"].as_array().unwrap().len(), 1);
    }
    #[cfg(feature = "server")]
    #[tokio::test]
    async fn semantic_search_uses_embedding_vectors_with_citations() {
        use axum::{routing::post, Json, Router};
        use std::future::IntoFuture;
        async fn embeddings(Json(body): Json<Value>) -> Json<Value> {
            let data = body["input"]
                .as_array()
                .unwrap()
                .iter()
                .enumerate()
                .map(|(index, text)| {
                    let vector = if text.as_str().unwrap().contains("water") {
                        vec![0.0, 1.0]
                    } else {
                        vec![1.0, 0.0]
                    };
                    json!({"index":index,"embedding":vector})
                })
                .collect::<Vec<_>>();
            Json(json!({"data":data}))
        }
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let endpoint = format!("http://{}/embeddings", listener.local_addr().unwrap());
        let task = tokio::spawn(
            axum::serve(
                listener,
                Router::new().route("/embeddings", post(embeddings)),
            )
            .into_future(),
        );
        // Test-specific Hub configuration avoids modifying global environment variables.
        let dir = tempfile::tempdir().unwrap();
        let mut hub = Hub::open(dir.path().join("workspace.json")).unwrap();
        hub.test_embedding = Some((endpoint, "fixture-model".into(), "fixture-only".into()));
        for (name, content) in [
            ("Physics.md", "gravity attracts objects"),
            ("Chemistry.md", "water contains hydrogen"),
        ] {
            hub.request(
                "POST",
                "/knowledge/index",
                json!({"folder":"inbox","name":name,"content":content,"vectorize":true}),
            )
            .await
            .unwrap();
        }
        let result = hub
            .request(
                "POST",
                "/knowledge/search",
                json!({"folder":"inbox","query":"fall","semantic":true}),
            )
            .await
            .unwrap();
        assert_eq!(result["mode"], "semantic");
        assert_eq!(result["results"][0]["source"], "Physics.md");
        assert_eq!(result["results"][0]["score"], 1.0);
        assert_eq!(result["results"][0]["chunk"], 1);
        task.abort();
    }
    #[cfg(feature = "server")]
    #[tokio::test]
    async fn provider_http_adapters_send_shared_context_and_redact_errors() {
        use axum::{
            extract::State,
            http::{StatusCode, Uri},
            routing::any,
            Json, Router,
        };
        use std::future::IntoFuture;
        let captured: Arc<Mutex<Vec<Value>>> = Arc::new(Mutex::new(Vec::new()));
        async fn mock(
            State(captured): State<Arc<Mutex<Vec<Value>>>>,
            uri: Uri,
            Json(body): Json<Value>,
        ) -> (StatusCode, Json<Value>) {
            captured.lock().await.push(body);
            if uri.path().starts_with("/bad") {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({"error":"fixture-private-key-must-not-leak"})),
                );
            }
            (
                StatusCode::OK,
                Json(
                    json!({"choices":[{"message":{"content":"OpenAI reply"}}],"content":[{"text":"Claude reply"}],"candidates":[{"content":{"parts":[{"text":"Gemini reply"}]}}]}),
                ),
            )
        }
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        let task = tokio::spawn(
            axum::serve(
                listener,
                Router::new()
                    .fallback(any(mock))
                    .with_state(captured.clone()),
            )
            .into_future(),
        );
        let dir = tempfile::tempdir().unwrap();
        let hub = Hub::open(dir.path().join("workspace.json")).unwrap();
        let messages = vec![
            Message {
                id: id(),
                thread: "t".into(),
                role: "user".into(),
                source: "User".into(),
                content: "Question".into(),
                client_id: None,
                error: false,
            },
            Message {
                id: id(),
                thread: "t".into(),
                role: "assistant".into(),
                source: "other-ai".into(),
                content: "Other AI evidence".into(),
                client_id: None,
                error: false,
            },
        ];
        for (kind, expected) in [
            ("openai_compat", "OpenAI reply"),
            ("anthropic", "Claude reply"),
            ("gemini", "Gemini reply"),
        ] {
            let source = Source {
                id: "actor".into(),
                name: "Actor".into(),
                kind: kind.into(),
                model: "fixture-model".into(),
                base_url: base.clone(),
                api_key_env: "TOM_TEST_NONEXISTENT_KEY".into(),
            };
            assert_eq!(hub.reply(&source, &messages).await.unwrap(), expected);
            let mut broken = source.clone();
            broken.base_url = format!("{base}/bad");
            let error = hub.reply(&broken, &messages).await.unwrap_err();
            assert!(error.contains("401"));
            assert!(!error.contains("fixture-private-key"));
        }
        let bodies = captured.lock().await;
        assert_eq!(bodies.len(), 6);
        assert!(bodies
            .iter()
            .all(|b| b.to_string().contains("Other AI evidence")));
        task.abort();
    }
}
