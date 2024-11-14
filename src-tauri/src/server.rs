use actix_web::{get, App, HttpResponse, HttpServer, Responder};

#[get("/status")]
async fn status() -> impl Responder {
    HttpResponse::Ok().body("Server is running")
}

pub async fn start_server() -> std::io::Result<()> {
    let server = HttpServer::new(|| App::new().service(status))
        .bind("127.0.0.1:8080")?;

    print!("Starting server on 127.0.0.1:8080");
    server.run().await
}
