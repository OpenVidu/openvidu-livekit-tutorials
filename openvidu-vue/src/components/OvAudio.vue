<template>
	<audio playsinline/>
</template>

<script>
export default {
	name: 'OvAudio',

	props: {
		track: Object,
	},

	mounted () {
		this.track.attach(this.$el);
	},
};
</script>
