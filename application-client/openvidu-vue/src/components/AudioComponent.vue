<script setup lang="ts">
import { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';
import { onMounted, onUnmounted, ref } from 'vue';

const props = defineProps<{
    track: LocalAudioTrack | RemoteAudioTrack;
}>();
const audioElement = ref<HTMLMediaElement | null>(null);

onMounted(() => {
    if (audioElement.value) {
        props.track.attach(audioElement.value);
    }
});

onUnmounted(() => {
    props.track.detach();
});
</script>

<template>
    <audio ref="audioElement" :id="track.sid"></audio>
</template>
