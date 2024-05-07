require "sinatra"
require "sinatra/cors"
require "livekit"
require "./env.rb"

SERVER_PORT = ENV["SERVER_PORT"] || 6080
LIVEKIT_API_KEY = ENV["LIVEKIT_API_KEY"] || "devkey"
LIVEKIT_API_SECRET = ENV["LIVEKIT_API_SECRET"] || "secret"

set :port, SERVER_PORT

register Sinatra::Cors
set :allow_origin, "*"
set :allow_methods, "POST,OPTIONS"
set :allow_headers, "content-type"

post "/token" do
  content_type :json

  body = JSON.parse(request.body.read)
  room_name = body["roomName"]
  participant_name = body["participantName"]

  if room_name.nil? || participant_name.nil?
    status 400
    return JSON.generate("roomName and participantName are required")
  end

  token = LiveKit::AccessToken.new(api_key: LIVEKIT_API_KEY, api_secret: LIVEKIT_API_SECRET)
  token.identity = participant_name
  token.add_grant(roomJoin: true, room: room_name)

  return JSON.generate(token.to_jwt)
end
