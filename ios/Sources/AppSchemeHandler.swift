import WebKit
import UniformTypeIdentifiers

/// Serves the bundled web app (WebDist/) over a custom `pococo://` scheme.
/// file:// cannot be used directly: ES-module scripts require CORS and the
/// file scheme has a null origin, so Vite's module bundle never executes.
final class AppSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "pococo"
    static let indexURL = URL(string: "\(scheme)://app/index.html")!

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else { return }

        var path = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        if path.isEmpty { path = "index.html" }

        guard let fileURL = Bundle.main.url(forResource: path, withExtension: nil, subdirectory: "WebDist"),
              let data = try? Data(contentsOf: fileURL) else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }

        let mimeType = Self.mimeType(for: fileURL.pathExtension)
        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mimeType,
                "Content-Length": String(data.count),
                "Access-Control-Allow-Origin": "*",
            ]
        )!

        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    /// Module scripts are rejected unless served with a JavaScript MIME type,
    /// so the web-relevant extensions are mapped explicitly.
    private static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html"
        case "js", "mjs": return "text/javascript"
        case "css": return "text/css"
        case "svg": return "image/svg+xml"
        case "json": return "application/json"
        case "png": return "image/png"
        case "woff2": return "font/woff2"
        default:
            return UTType(filenameExtension: ext)?.preferredMIMEType ?? "application/octet-stream"
        }
    }
}
