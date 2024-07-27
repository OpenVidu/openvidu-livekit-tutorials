package io.openvidu.android

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import io.openvidu.android.databinding.ActivityMainBinding
import io.openvidu.android.databinding.DialogSettingsBinding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    // Configure this variables with correct URLs depending on your deployment
    private var applicationServerUrl = "https://{YOUR-LAN-IP}.openvidu-local.dev:6443/"
    private var livekitUrl = "wss://{YOUR-LAN-IP}.openvidu-local.dev:7443/"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.participantName.setText("Participant%d".format((1..100).random()))

        binding.joinButton.setOnClickListener {
            navigateToRoomLayoutActivity()
        }

        binding.settingsButton.setOnClickListener {
            showSettingsDialog()
        }
    }

    private fun navigateToRoomLayoutActivity() {
        binding.joinButton.isEnabled = false

        val participantName = binding.participantName.text.toString()
        val roomName = binding.roomName.text.toString()

        if (participantName.isNotEmpty() && roomName.isNotEmpty()) {
            val intent = Intent(this, RoomLayoutActivity::class.java)
            intent.putExtra("participantName", participantName)
            intent.putExtra("roomName", roomName)
            intent.putExtra("serverUrl", applicationServerUrl)
            intent.putExtra("livekitUrl", livekitUrl)
            startActivity(intent)
        } else {
            Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
        }

        binding.joinButton.isEnabled = true
    }

    /**
     * This dialog allows to change the LiveKit URL and the application server URL
     * from the application itself. This is useful for development purposes.
     */
    private fun showSettingsDialog() {
        val dialogBinding = DialogSettingsBinding.inflate(LayoutInflater.from(this))

        dialogBinding.serverUrl.setText(applicationServerUrl)
        dialogBinding.livekitUrl.setText(livekitUrl)

        val builder = AlertDialog.Builder(this)
        builder.setTitle("Configure URLs")
            .setView(dialogBinding.root)
            .setPositiveButton("Save") { dialog, _ ->
                applicationServerUrl = dialogBinding.serverUrl.text.toString()
                livekitUrl = dialogBinding.livekitUrl.text.toString()
                dialog.dismiss()
            }
            .setNegativeButton("Cancel") { dialog, _ ->
                dialog.dismiss()
            }

        val dialog = builder.create()
        dialog.show()
    }
}