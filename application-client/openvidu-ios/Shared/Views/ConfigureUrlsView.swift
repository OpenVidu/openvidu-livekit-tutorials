/*
 * Copyright 2024 OpenVidu
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Foundation
import LiveKit
import SFSafeSymbols
import SwiftUI

struct ConfigureUrlsView: View {
    
    @EnvironmentObject var appCtx: AppContext
    @EnvironmentObject var roomCtx: RoomContext
    
    @State private var applicationServerUrl: String = ""
    @State private var livekitUrl: String = ""
    @State private var errorMessage: String = ""
    
    var body: some View {
        GeometryReader { geometry in
            Color.ovGray
                .ignoresSafeArea()
            ScrollView {
                VStack(alignment: .center, spacing: 40.0) {
                    
                    Text("Configure the LiveKit URL and the Application Server URL before connecting to the Room")
                    
                    VStack(spacing: 15) {
                        LKTextField(title: "Application Server URL", text: $applicationServerUrl, type: .URL)
                        LKTextField(title: "LiveKit URL", text: $livekitUrl, type: .URL)
                    }
                    .frame(maxWidth: 350)
                    
                    
                    HStack(alignment: .center) {
                        Spacer()
                        
                        LKButton(title: "Save") {
                            Task.detached { @MainActor in
                                let isApplicationServerValid = isValidURL(self.applicationServerUrl)
                                let isLivekitUrlValid = isValidURL(self.livekitUrl)
                                
                                if !isApplicationServerValid || !isLivekitUrlValid {
                                    print("Invalid URLs")
                                    errorMessage = "There was an error with the url values"
                                    return
                                }
                                appCtx.applicationServerUrl = self.applicationServerUrl
                                roomCtx.livekitUrl = self.livekitUrl
                                errorMessage = ""
                            }
                        }
                        
                        Spacer()
                    }
                    
                    Text(errorMessage)
                        .foregroundColor(.red)
                }
                .padding()
                .frame(width: geometry.size.width) // Make the scroll view full-width
                .frame(minHeight: geometry.size.height) // Set the content’s min height to the parent
            }
        }
    }
    
    func isValidURL(_ urlString: String) -> Bool {
        guard let url = URL(string: urlString),
              let scheme = url.scheme else {
            return false
        }
        return ["http", "https", "ws", "wss"].contains(scheme)
    }
}
