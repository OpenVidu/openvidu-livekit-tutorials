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

import LiveKit
import SFSafeSymbols
import SwiftUI

struct ParticipantView: View {
    @ObservedObject var participant: Participant
    @EnvironmentObject var appCtx: AppContext
    
    var videoViewMode: VideoView.LayoutMode = .fill
    
    @State private var isRendering: Bool = false
    
    func bgView(systemSymbol: SFSymbol, geometry: GeometryProxy) -> some View {
        Image(systemSymbol: systemSymbol)
            .resizable()
            .aspectRatio(contentMode: .fit)
            .foregroundColor(Color.ovGray2)
            .frame(width: min(geometry.size.width, geometry.size.height) * 0.3)
            .frame(
                maxWidth: .infinity,
                maxHeight: .infinity
            )
    }
    
    var body: some View {
        GeometryReader { geometry in
            
            ZStack(alignment: .bottom) {
                // Background color
                Color.ovGray
                    .ignoresSafeArea()
                
                // VideoView for the Participant
                if let publication = participant.mainVideoPublication,
                   !publication.isMuted,
                   let track = publication.track as? VideoTrack
                {
                    ZStack(alignment: .topLeading) {
                        SwiftUIVideoView(track,
                                         layoutMode: videoViewMode,
                                         isRendering: $isRendering)
                        
                        if !isRendering {
                            ProgressView().progressViewStyle(CircularProgressViewStyle())
                                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                        }
                        
                        // Display participant name in the top leading corner
                        if let participantName = participant.identity?.description {
                            Text(participantName)  // Assuming `participant` has a `name` property
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding(8)
                                .background(Color.black.opacity(0.6))
                                .cornerRadius(8)
                                .padding([.top, .leading], 16) // Adjust padding as needed
                        }
                        
                    }
                } else if let publication = participant.mainVideoPublication as? RemoteTrackPublication,
                          case .notAllowed = publication.subscriptionState
                {
                    // Show no permission icon
                    bgView(systemSymbol: .exclamationmarkCircle, geometry: geometry)
                } else {
                    // Show no camera icon
                    ZStack(alignment: .topLeading) {
                        // Display participant name in the top leading corner
                        bgView(systemSymbol: .videoSlashFill, geometry: geometry)

                        if let participantName = participant.identity?.description {
                            Text(participantName)  // Assuming `participant` has a `name` property
                                .font(.headline)
                                .foregroundColor(.white)
                                .padding(8)
                                .background(Color.black.opacity(0.6))
                                .cornerRadius(8)
                                .padding([.top, .leading], 16) // Adjust padding as needed
                        }
                    }
                    
                }
            }
            .cornerRadius(8)
        }
    }
}
