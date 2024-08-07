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

class HTTPClient {
    
    func getToken(applicationServerUrl: String, roomName: String, participantName: String) async throws -> String {
        guard let url = URL(string: "\(applicationServerUrl)/token") else {
            throw URLError(.badURL)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let tokenRequest = TokenRequest(roomName: roomName, participantName: participantName)
        let jsonData = try JSONEncoder().encode(tokenRequest)
        request.httpBody = jsonData
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw URLError(.badServerResponse)
            }
            
            guard httpResponse.statusCode == 200 else {
                let errorResponse = try? JSONDecoder().decode([String: String].self, from: data)
                let errorMessage = errorResponse?["errorMessage"] ?? "Unknown error"
                throw NSError(domain: "HTTPServiceError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP Error: \(errorMessage)"])
            }
            
            let tokenResponse = try JSONDecoder().decode(TokenResponse.self, from: data)
            return tokenResponse.token
            
        } catch {
            print("Error occurred: \(error.localizedDescription)")
            throw error
        }
    }
}
