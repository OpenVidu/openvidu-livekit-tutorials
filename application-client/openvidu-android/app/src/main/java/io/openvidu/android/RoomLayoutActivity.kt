package io.openvidu.android

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.engine.cio.CIO
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.livekit.android.LiveKit
import io.livekit.android.events.RoomEvent
import io.livekit.android.events.collect
import io.livekit.android.room.Room
import io.livekit.android.renderer.SurfaceViewRenderer
import io.livekit.android.room.track.VideoTrack
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable

class RoomLayoutActivity : AppCompatActivity() {
    private lateinit var APPLICATION_SERVER_URL: String
    private lateinit var LIVEKIT_URL: String

    private lateinit var room: Room

    private val client = HttpClient(CIO) {
        expectSuccess = true
        install(ContentNegotiation) {
            json()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_room_layout)

        APPLICATION_SERVER_URL = intent.getStringExtra("serverUrl") ?: ""
        LIVEKIT_URL = intent.getStringExtra("livekitUrl") ?: ""

        // Create Room object.
        room = LiveKit.create(applicationContext)

        // Setup the video renderer
        room.initVideoRenderer(findViewById<SurfaceViewRenderer>(R.id.renderer))

        requestNeededPermissions { connectToRoom() }
    }

    private fun connectToRoom() {
        val participantName = intent.getStringExtra("participantName") ?: "Participant 1"
        val roomName = intent.getStringExtra("roomName") ?: "Test Room"

        lifecycleScope.launch {
            // Setup event handling.
            launch {
                room.events.collect { event ->
                    when (event) {
                        is RoomEvent.TrackSubscribed -> onTrackSubscribed(event)
                        is RoomEvent.TrackUnsubscribed -> onTrackUnsubscribed(event)
                        else -> {}
                    }
                }
            }

            try {
                // Get token from server.
                val token = getToken(roomName, participantName)

                // Connect to server.
                room.connect(LIVEKIT_URL, token)

                // Turn on audio/video recording.
                val localParticipant = room.localParticipant
                localParticipant.setMicrophoneEnabled(true)
                localParticipant.setCameraEnabled(true)
            } catch (e: Exception) {
                println("There was an error connecting to the room: ${e.message}")
                Toast.makeText(this@RoomLayoutActivity, "Failed to join room", Toast.LENGTH_SHORT)
                    .show()
                leaveRoom()
            }
        }
    }

    private fun onTrackSubscribed(event: RoomEvent.TrackSubscribed) {
        val track = event.track

        if (track is VideoTrack) {
            attachVideo(track)
        }
    }

    private fun attachVideo(videoTrack: VideoTrack) {
        videoTrack.addRenderer(findViewById<SurfaceViewRenderer>(R.id.renderer))
        findViewById<View>(R.id.progress).visibility = View.GONE
    }

    private fun onTrackUnsubscribed(event: RoomEvent.TrackUnsubscribed) {
        val track = event.track

        if (track is VideoTrack) {
            detachVideo(track)
        }
    }

    private fun detachVideo(videoTrack: VideoTrack) {
        videoTrack.removeRenderer(findViewById<SurfaceViewRenderer>(R.id.renderer))
        findViewById<View>(R.id.progress).visibility = View.VISIBLE
    }

    private fun leaveRoom() {
        room.disconnect()
        client.close()
        // Go back to the previous activity.
        finish()
    }

    override fun onDestroy() {
        super.onDestroy()
        leaveRoom()
    }

    private fun requestNeededPermissions(onHasPermissions: () -> Unit) {
        val requestPermissionLauncher =
            registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
                var hasDenied = false

                // Check if any permissions weren't granted.
                for (grant in grants.entries) {
                    if (!grant.value) {
                        Toast.makeText(this, "Missing permission: ${grant.key}", Toast.LENGTH_SHORT)
                            .show()

                        hasDenied = true
                    }
                }

                if (!hasDenied) {
                    onHasPermissions()
                }
            }

        // Assemble the needed permissions to request
        val neededPermissions =
            listOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA).filter {
                ContextCompat.checkSelfPermission(
                    this, it
                ) == PackageManager.PERMISSION_DENIED
            }.toTypedArray()

        if (neededPermissions.isNotEmpty()) {
            requestPermissionLauncher.launch(neededPermissions)
        } else {
            onHasPermissions()
        }
    }

    private suspend fun getToken(roomName: String, participantName: String): String {
        val response = client.post(APPLICATION_SERVER_URL + "token") {
            contentType(ContentType.Application.Json)
            setBody(TokenRequest(participantName, roomName))
        }
        return response.body<TokenResponse>().token
    }
}

@Serializable
data class TokenRequest(val participantName: String, val roomName: String)

@Serializable
data class TokenResponse(val token: String)
