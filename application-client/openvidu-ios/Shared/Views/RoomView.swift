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

let adaptiveMin = 170.0
let toolbarPlacement: ToolbarItemPlacement = .bottomBar


extension CIImage {
    // helper to create a `CIImage` for both platforms
    convenience init(named name: String) {
    self.init(cgImage: UIImage(named: name)!.cgImage!)

    }
}

struct RoomView: View {
    @EnvironmentObject var appCtx: AppContext
    @EnvironmentObject var roomCtx: RoomContext
    @EnvironmentObject var room: Room
    
    @State var isCameraPublishingBusy = false
    @State var isMicrophonePublishingBusy = false
        
    func sortedParticipants() -> [Participant] {
        room.allParticipants.values.sorted { p1, p2 in
            if p1 is LocalParticipant { return true }
            if p2 is LocalParticipant { return false }
            return (p1.joinedAt ?? Date()) < (p2.joinedAt ?? Date())
        }
    }
    
    func content(geometry: GeometryProxy) -> some View {
        VStack {
            
            HStack {
                // Title Text
                Text(roomCtx.name)
                    .font(.title2)
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.white)
                    .padding()
                
                Spacer() // Pushes the button to the right
                Button(action: {
                    Task {
                        await roomCtx.disconnect()
                    }
                }, label: {
                    HStack {
                        Image(systemSymbol: .xmarkCircleFill)
                            .renderingMode(.original)
                        Text("Leave Room")
                            .font(.headline)
                            .fontWeight(.semibold)
                    }
                    .padding(8)
                    .background(Color.red.opacity(0.8)) // Background color for the button
                    .foregroundColor(.white) // Text color
                    .cornerRadius(8)
                })
                //.padding()
            }
            
            // Re-connecting Status
            if case .connecting = room.connectionState {
                Text("Re-connecting...")
                    .font(.subheadline)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.black.opacity(0.6))
                    .cornerRadius(8)
                    .padding(.bottom)
            }
            // Participant layout
            HorVStack(axis: geometry.isTall ? .vertical : .horizontal, spacing: 5) {
                Group {
                    ParticipantLayout(sortedParticipants(), spacing: 5) { participant in
                        ParticipantView(participant: participant, videoViewMode: .fill)
                    }
                }
                .frame(
                    minWidth: 0,
                    maxWidth: .infinity,
                    minHeight: 0,
                    maxHeight: .infinity
                )
            }
            .padding(5)
        }
    }
    
    var body: some View {
        GeometryReader { geometry in
            content(geometry: geometry)
        }
        .toolbar {
            ToolbarItemGroup(placement: toolbarPlacement) {
                HStack {
                    Spacer()
                    
                    let isMicrophoneEnabled = room.localParticipant.isMicrophoneEnabled()
                    let isCameraEnabled = room.localParticipant.isCameraEnabled()
                    
                    Button(action: {
                        Task {
                            isCameraPublishingBusy = true
                            defer { Task { @MainActor in isCameraPublishingBusy = false } }
                            do {
                                try await room.localParticipant.setCamera(enabled: !isCameraEnabled)
                            } catch {
                                print("Failed to toggle camera: \(error)")
                            }
                        }
                    }, label: {
                        Image(systemSymbol: isCameraEnabled ? .videoFill : .videoSlashFill)
                            .renderingMode(isCameraEnabled ? .original : .template)
                    })
                    .disabled(isCameraPublishingBusy)
                    
                    
                    Button(action: {
                        Task {
                            isMicrophonePublishingBusy = true
                            defer { Task { @MainActor in isMicrophonePublishingBusy = false } }
                            do {
                                try await room.localParticipant.setMicrophone(enabled: !isMicrophoneEnabled)
                            } catch {
                                print("Failed to toggle microphone: \(error)")
                            }
                        }
                    },
                           label: {
                        Image(systemSymbol: isMicrophoneEnabled ? .micFill : .micSlashFill)
                            .renderingMode(isMicrophoneEnabled ? .original : .template)
                    })
                    .disabled(isMicrophonePublishingBusy)
                    
                    Spacer()
                }
            }
        }
    }
    
}

struct ParticipantLayout<Content: View>: View {
    let views: [AnyView]
    let spacing: CGFloat
    
    init<Data: RandomAccessCollection>(
        _ data: Data,
        id: KeyPath<Data.Element, Data.Element> = \.self,
        spacing: CGFloat,
        @ViewBuilder content: @escaping (Data.Element) -> Content
    ) {
        self.spacing = spacing
        views = data.map { AnyView(content($0[keyPath: id])) }
    }
    
    func computeColumn(with geometry: GeometryProxy) -> (x: Int, y: Int) {
        let sqr = Double(views.count).squareRoot()
        let r: [Int] = [Int(sqr.rounded()), Int(sqr.rounded(.up))]
        let c = geometry.isTall ? r : r.reversed()
        return (x: c[0], y: c[1])
    }
    
    func grid(axis: Axis, geometry: GeometryProxy) -> some View {
        ScrollView([axis == .vertical ? .vertical : .horizontal]) {
            HorVGrid(axis: axis, columns: [GridItem(.flexible())], spacing: spacing) {
                ForEach(0 ..< views.count, id: \.self) { i in
                    views[i]
                        .aspectRatio(1, contentMode: .fill)
                }
            }
            .padding(axis == .horizontal ? [.leading, .trailing] : [.top, .bottom],
                     max(0, ((axis == .horizontal ? geometry.size.width : geometry.size.height)
                             - ((axis == .horizontal ? geometry.size.height : geometry.size.width) * CGFloat(views.count)) - (spacing * CGFloat(views.count - 1))) / 2))
        }
    }
    
    var body: some View {
        GeometryReader { geometry in
            if views.isEmpty {
                EmptyView()
            } else if geometry.size.width <= 300 {
                grid(axis: .vertical, geometry: geometry)
            } else if geometry.size.height <= 300 {
                grid(axis: .horizontal, geometry: geometry)
            } else {
                let verticalWhenTall: Axis = geometry.isTall ? .vertical : .horizontal
                let horizontalWhenTall: Axis = geometry.isTall ? .horizontal : .vertical
                
                switch views.count {
                    // simply return first view
                case 1: views[0]
                case 3: HorVStack(axis: verticalWhenTall, spacing: spacing) {
                    views[0]
                    HorVStack(axis: horizontalWhenTall, spacing: spacing) {
                        views[1]
                        views[2]
                    }
                }
                case 5: HorVStack(axis: verticalWhenTall, spacing: spacing) {
                    views[0]
                    if geometry.isTall {
                        HStack(spacing: spacing) {
                            views[1]
                            views[2]
                        }
                        HStack(spacing: spacing) {
                            views[3]
                            views[4]
                        }
                    } else {
                        VStack(spacing: spacing) {
                            views[1]
                            views[3]
                        }
                        VStack(spacing: spacing) {
                            views[2]
                            views[4]
                        }
                    }
                }
                default:
                    let c = computeColumn(with: geometry)
                    VStack(spacing: spacing) {
                        ForEach(0 ... (c.y - 1), id: \.self) { y in
                            HStack(spacing: spacing) {
                                ForEach(0 ... (c.x - 1), id: \.self) { x in
                                    let index = (y * c.x) + x
                                    if index < views.count {
                                        views[index]
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

struct HorVStack<Content: View>: View {
    let axis: Axis
    let horizontalAlignment: HorizontalAlignment
    let verticalAlignment: VerticalAlignment
    let spacing: CGFloat?
    let content: () -> Content
    
    init(axis: Axis = .horizontal,
         horizontalAlignment: HorizontalAlignment = .center,
         verticalAlignment: VerticalAlignment = .center,
         spacing: CGFloat? = nil,
         @ViewBuilder content: @escaping () -> Content)
    {
        self.axis = axis
        self.horizontalAlignment = horizontalAlignment
        self.verticalAlignment = verticalAlignment
        self.spacing = spacing
        self.content = content
    }
    
    var body: some View {
        Group {
            if axis == .vertical {
                VStack(alignment: horizontalAlignment, spacing: spacing, content: content)
            } else {
                HStack(alignment: verticalAlignment, spacing: spacing, content: content)
            }
        }
    }
}

struct HorVGrid<Content: View>: View {
    let axis: Axis
    let spacing: CGFloat?
    let content: () -> Content
    let columns: [GridItem]
    
    init(axis: Axis = .horizontal,
         columns: [GridItem],
         spacing: CGFloat? = nil,
         @ViewBuilder content: @escaping () -> Content)
    {
        self.axis = axis
        self.spacing = spacing
        self.columns = columns
        self.content = content
    }
    
    var body: some View {
        Group {
            if axis == .vertical {
                LazyVGrid(columns: columns, spacing: spacing, content: content)
            } else {
                LazyHGrid(rows: columns, spacing: spacing, content: content)
            }
        }
    }
}

extension GeometryProxy {
    public var isTall: Bool {
        size.height > size.width
    }
    
    var isWide: Bool {
        size.width > size.height
    }
}
