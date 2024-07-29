package io.openvidu.android

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import io.livekit.android.room.Room
import io.openvidu.android.databinding.ParticipantItemBinding

class ParticipantAdapter(private val participantTracks: List<TrackInfo>, private val room: Room) :
    RecyclerView.Adapter<ParticipantViewHolder>() {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ParticipantViewHolder =
        ParticipantViewHolder(
            ParticipantItemBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        )

    override fun onBindViewHolder(holder: ParticipantViewHolder, position: Int) {
        val trackInfo = participantTracks[position]
        holder.render(trackInfo, room)
    }

    override fun getItemCount(): Int = participantTracks.size
}