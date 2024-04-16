#!/usr/bin/ruby

require 'sinatra'
require 'sinatra/cors'
require 'faraday'
require 'json'
require 'livekit'
require './env.rb'

# Load env variables
SERVER_PORT = ENV['SERVER_PORT']
LIVEKIT_API_KEY = ENV['LIVEKIT_API_KEY']
LIVEKIT_API_SECRET = ENV['LIVEKIT_API_SECRET']

set :port, SERVER_PORT

register Sinatra::Cors
set :allow_origin, "*"
set :allow_methods, "POST,OPTIONS"
set :allow_headers, "content-type"

post '/token' do

  content_type :json

  body = JSON.parse(request.body.read)
  room_name = body['roomName']
  participant_name = body['participantName']

  if room_name.nil? || participant_name.nil?
    status 400
    return 'roomName and participantName are required'
  end

  # By default, a token expires after 6 hours.
  # You may override this by passing in ttl when creating the token. ttl is expressed in seconds.
  token = LiveKit::AccessToken.new(api_key: LIVEKIT_API_KEY, api_secret: LIVEKIT_API_SECRET)
  token.identity = participant_name
  token.name = participant_name
  token.add_grant(roomJoin: true, room: room_name)

  token.to_jwt
end
