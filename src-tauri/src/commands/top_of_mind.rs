use serde_json::Value;
use top_of_mind_core::Hub;

#[derive(Default)]
pub struct TopOfMindState {
    hub: tokio::sync::OnceCell<Hub>,
}

#[tauri::command]
pub async fn tom_request(
    state: tauri::State<'_, TopOfMindState>,
    method: String,
    path: String,
    body: Option<Value>,
) -> Result<Value, String> {
    let hub = state
        .inner()
        .hub
        .get_or_try_init(|| async {
            Hub::open(crate::storage::data_dir().join("top-of-mind/workspace.json"))
        })
        .await?;
    hub.request(&method, &path, body.unwrap_or(Value::Null))
        .await
}
