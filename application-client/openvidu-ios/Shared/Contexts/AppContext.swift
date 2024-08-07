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

import Combine
import LiveKit
import SwiftUI

// This class contains the logic to control behavior of the whole app.
final class AppContext: ObservableObject {
    private let store: ValueStore<Preferences>
    
    @Published var applicationServerUrl: String = "" {
        didSet { store.value.applicationServerUrl = applicationServerUrl }
    }

    public init(store: ValueStore<Preferences>) {
        self.store = store

        applicationServerUrl = store.value.applicationServerUrl
    }
    
}
