package io.openvidu.android

import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import io.openvidu.android.databinding.ActivityConfigureUrlsBinding

class ConfigureUrlsActivity : AppCompatActivity() {
    private lateinit var binding: ActivityConfigureUrlsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityConfigureUrlsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.serverUrl.setText(Urls.applicationServerUrl)
        binding.livekitUrl.setText(Urls.livekitUrl)

        binding.saveButton.setOnClickListener {
            onSaveUrls()
        }
    }

    private fun onSaveUrls() {
        val serverUrl = binding.serverUrl.text.toString()
        val livekitUrl = binding.livekitUrl.text.toString()

        if (serverUrl.isNotEmpty() && livekitUrl.isNotEmpty()) {
            Urls.livekitUrl = binding.livekitUrl.text.toString()
            Urls.applicationServerUrl = binding.serverUrl.text.toString()
            finish()
        } else {
            Toast.makeText(this, "Please fill in all fields", Toast.LENGTH_SHORT).show()
        }
    }
}