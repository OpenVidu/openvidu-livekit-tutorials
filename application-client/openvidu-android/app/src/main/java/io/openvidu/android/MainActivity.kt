package io.openvidu.android

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.widget.Button
import android.widget.EditText
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.floatingactionbutton.FloatingActionButton

class MainActivity : AppCompatActivity() {
    private lateinit var participantField: EditText
    private lateinit var roomField: EditText
    private lateinit var joinButton: Button

    private var applicationServerUrl = "https://192-168-1-136.openvidu-local.dev:6443/"
    private var livekitUrl = "wss://192-168-1-136.openvidu-local.dev:7443/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        participantField = findViewById(R.id.participantName)
        roomField = findViewById(R.id.roomName)
        joinButton = findViewById(R.id.joinButton)
        val settingsButton = findViewById<FloatingActionButton>(R.id.settingsButton)

        participantField.setText("Participant %d".format((1..100).random()))

        joinButton.setOnClickListener {
            navigateToRoomLayoutActivity()
        }

        settingsButton.setOnClickListener {
            showSettingsDialog()
        }
    }

    private fun navigateToRoomLayoutActivity() {
        joinButton.isEnabled = false

        val participantName = participantField.text.toString()
        val roomName = roomField.text.toString()

        if (participantName.isNotEmpty() && roomName.isNotEmpty()) {
            val intent = Intent(this, RoomLayoutActivity::class.java)
            intent.putExtra("participantName", participantName)
            intent.putExtra("roomName", roomName)
            intent.putExtra("serverUrl", applicationServerUrl)
            intent.putExtra("livekitUrl", livekitUrl)
            startActivity(intent)
        }

        joinButton.isEnabled = true
    }

    private fun showSettingsDialog() {
        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_settings, null)
        val serverUrl = dialogView.findViewById<EditText>(R.id.serverUrl)
        val liveKitUrl = dialogView.findViewById<EditText>(R.id.livekitUrl)

        serverUrl.setText(applicationServerUrl)
        liveKitUrl.setText(livekitUrl)

        val builder = AlertDialog.Builder(this)
        builder.setTitle("Configure URLs")
            .setView(dialogView)
            .setPositiveButton("Save") { dialog, _ ->
                applicationServerUrl = serverUrl.text.toString()
                livekitUrl = liveKitUrl.text.toString()
                dialog.dismiss()
            }
            .setNegativeButton("Cancel") { dialog, _ ->
                dialog.dismiss()
            }

        val dialog = builder.create()
        dialog.show()
    }
}