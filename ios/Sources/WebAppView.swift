import SwiftUI
import WebKit

/// Hosts the bundled Pocket COO web app (WebDist/) in a WKWebView.
/// localStorage persistence works via the default (persistent) website data store.
struct WebAppView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.setURLSchemeHandler(AppSchemeHandler(), forURLScheme: AppSchemeHandler.scheme)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0x16 / 255.0, green: 0x17 / 255.0, blue: 0x1D / 255.0, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        webView.load(URLRequest(url: AppSchemeHandler.indexURL))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
