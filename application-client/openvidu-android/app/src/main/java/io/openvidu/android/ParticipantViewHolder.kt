package io.openvidu.android

import androidx.recyclerview.widget.RecyclerView
import io.livekit.android.room.Room
import io.openvidu.android.databinding.ParticipantItemBinding

class ParticipantViewHolder(private val binding: ParticipantItemBinding) :
    RecyclerView.ViewHolder(binding.root) {

    private var used = false

    fun render(trackInfo: TrackInfo, room: Room) {
        val participantIdentity = if (trackInfo.isLocal) {
            trackInfo.participantIdentity + " (You)"
        } else {
            trackInfo.participantIdentity
        }

        binding.identity.text = participantIdentity

        // Only initialize the renderer once
        if (!used) {
            room.initVideoRenderer(binding.renderer)
            used = true
        }

        trackInfo.track.addRenderer(binding.renderer)
    }
}
