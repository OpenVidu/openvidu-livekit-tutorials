require 'sinatra'
require 'sinatra/json'
require 'sinatra/cors'
require 'livekit'
require './env.rb'

SERVER_PORT = ENV['SERVER_PORT'] || 6080
LIVEKIT_API_KEY = ENV['LIVEKIT_API_KEY'] || 'devkey'
LIVEKIT_API_SECRET = ENV['LIVEKIT_API_SECRET'] || 'secret'

set :port, SERVER_PORT

register Sinatra::Cors
set :allow_origin, '*'
set :allow_methods, 'POST,OPTIONS'
set :allow_headers, 'content-type'
set :bind, '0.0.0.0'

post '/token' do
  body = JSON.parse(request.body.read)
  room_name = body['roomName']
  participant_name = body['participantName']

  if room_name.nil? || participant_name.nil?
    status 400
    return json({errorMessage: 'roomName and participantName are required'})
  end

  token = LiveKit::AccessToken.new(api_key: LIVEKIT_API_KEY, api_secret: LIVEKIT_API_SECRET)
  token.identity = participant_name
  token.add_grant(roomJoin: true, room: room_name)

  return json({token: token.to_jwt})
end

post '/livekit/webhook' do
  auth_header = request.env['HTTP_AUTHORIZATION']
  token_verifier = LiveKit::TokenVerifier.new(api_key: LIVEKIT_API_KEY, api_secret: LIVEKIT_API_SECRET)
  begin
    token_verifier.verify(auth_header)
    body = JSON.parse(request.body.read)
    puts "LiveKit Webhook: #{body}"
    return
  rescue => e
    puts "Authorization header is not valid: #{e}"
  end
end