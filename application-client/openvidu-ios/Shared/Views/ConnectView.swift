/*
 * Copyright 2024 LiveKit
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

struct ConnectView: View {
    @EnvironmentObject var appCtx: AppContext
    @EnvironmentObject var roomCtx: RoomContext
    @EnvironmentObject var room: Room
    
    var httpService = HTTPClient()


    var body: some View {
        GeometryReader { geometry in
            Color.ovGray
                .ignoresSafeArea()
            ScrollView {
                VStack(alignment: .center, spacing: 40.0) {
                    VStack(spacing: 10) {
                        Image("logo")
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(height: 50)
                            .padding(.bottom, 10)
                    }

                    VStack(spacing: 15) {
                        LKTextField(title: "Participant Name", text: $roomCtx.localParticipantName, type: .ascii)
                        LKTextField(title: "Room Name", text: $roomCtx.name, type: .ascii)
                    }
                    .frame(maxWidth: 350)
                     
                    if case .connecting = room.connectionState {
                        HStack(alignment: .center) {
                            ProgressView()

                            LKButton(title: "Cancel") {
                                roomCtx.cancelConnect()
                            }
                        }
                    } else {
                        HStack(alignment: .center) {
                            
                            
                            Spacer()
                            
                            LKButton(title: "Reset urls", action:  {
                                Task.detached { @MainActor in
                                    roomCtx.livekitUrl = ""
                                    appCtx.applicationServerUrl = ""
                                }
                            }, color: Color.ovYellow)


                            LKButton(title: "Join") {
                                Task.detached { @MainActor in
                                    await connectToRoom()
                                }
                            }

                            Spacer()
                        }
                    }
                }
                .padding()
                .frame(width: geometry.size.width) // Make the scroll view full-width
                .frame(minHeight: geometry.size.height) // Set the content’s min height to the parent
            }
        }
        .alert(isPresented: $roomCtx.shouldShowDisconnectReason) {
            Alert(title: Text("Disconnected"),
                  message: Text("Reason: " + String(describing: roomCtx.latestError)))
        }
    }
    
    func connectToRoom() async {
        let livekitUrl = roomCtx.livekitUrl
        let roomName = roomCtx.name
        let participantName = roomCtx.localParticipantName
        let applicationServerUrl = appCtx.applicationServerUrl
        
        guard !livekitUrl.isEmpty, !roomName.isEmpty else {
            print("LiveKit URL or room name is empty")
            return
        }
        
        do {
            let token = try await httpService.getToken(applicationServerUrl: applicationServerUrl, roomName: roomName, participantName: participantName)
            print("Token received: \(token)")
            
            if token.isEmpty {
                print("Received empty token")
                return
            }
            
            roomCtx.token = token
            print("Connecting to room...")
            try await roomCtx.connect()
            print("Room connected")
            await enableCameraAndMicrophone()
           
        } catch {
            print("Error trying to connect to room: \(error.localizedDescription)")
        }
    }
    
    func enableCameraAndMicrophone() async {
        do {
            try await room.localParticipant.setCamera(enabled: true)
            try await room.localParticipant.setMicrophone(enabled: true)
        } catch {
            print("Error enabling camera and microphone: \(error.localizedDescription)")
        }
    }


}
