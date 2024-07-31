package io.openvidu.android

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import io.openvidu.android.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        checkUrls()

        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.participantName.setText("Participant%d".format((1..99).random()))

        binding.joinButton.setOnClickListener {
            navigateToRoomLayoutActivity()
        }
    }

    private fun checkUrls() {
        if (Urls.livekitUrl.isEmpty() || Urls.applicationServerUrl.isEmpty()) {
            val intent = Intent(this, ConfigureUrlsActivity::class.java)
            startActivity(intent)
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
            startActivity(intent)
        } else {
            Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
        }

        binding.joinButton.isEnabled = true
    }
}