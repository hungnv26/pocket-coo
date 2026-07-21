import SwiftUI

@main
struct PocketCOOApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    private let appBackground = Color(red: 0x16 / 255.0, green: 0x17 / 255.0, blue: 0x1D / 255.0)

    var body: some View {
        ZStack {
            appBackground.ignoresSafeArea()
            WebAppView()
        }
        .preferredColorScheme(.dark)
    }
}
