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
import SwiftUI

// This class contains the logic to control behavior of the room.
final class RoomContext: ObservableObject {
    let jsonEncoder = JSONEncoder()
    let jsonDecoder = JSONDecoder()

    private let store: ValueStore<Preferences>

    // Used to show connection error dialog
    @Published var shouldShowDisconnectReason: Bool = false
    public var latestError: LiveKitError?

    public let room = Room()

    @Published var livekitUrl: String = "" {
        didSet { store.value.livekitUrl = livekitUrl }
    }
    
    @Published var name: String = "" {
        didSet { store.value.name = name }
    }
    
    @Published var localParticipantName: String = "" {
        didSet { store.value.localParticipantName = localParticipantName }
    }

    @Published var token: String = "" {
        didSet { store.value.token = token }
    }

    @Published var textFieldString: String = ""

    var _connectTask: Task<Void, Error>?

    public init(store: ValueStore<Preferences>) {
        self.store = store
        room.add(delegate: self)

        livekitUrl = store.value.livekitUrl
        name = store.value.name
        token = store.value.token
        localParticipantName = store.value.localParticipantName

        #if os(iOS)
            UIApplication.shared.isIdleTimerDisabled = true
        #endif
    }

    deinit {
        #if os(iOS)
            UIApplication.shared.isIdleTimerDisabled = false
        #endif
        print("RoomContext.deinit")
    }

    func cancelConnect() {
        _connectTask?.cancel()
    }

    @MainActor
    func connect() async throws -> Room {

        let connectTask = Task.detached { [weak self] in
            guard let self else { return }
            try await self.room.connect(url: self.livekitUrl,token: self.token)
        }

        _connectTask = connectTask
        try await connectTask.value

        return room
    }

    func disconnect() async {
        await room.disconnect()
    }

}

extension RoomContext: RoomDelegate {

    func room(_ room: Room, didUpdateConnectionState connectionState: ConnectionState, from oldValue: ConnectionState) {
        print("Did update connectionState \(oldValue) -> \(connectionState)")

        if case .disconnected = connectionState,
           let error = room.disconnectError,
           error.type != .cancelled
        {
            latestError = room.disconnectError

            Task.detached { @MainActor [weak self] in
                guard let self else { return }
                self.shouldShowDisconnectReason = true
            }
        }
    }

}
