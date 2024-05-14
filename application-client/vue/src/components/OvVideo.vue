<template>
	<video autoplay/>
</template>

<script>
export default {
	name: 'OvVideo',

	props: {
		track: Object,
	},

	mounted () {
		this.track.attach(this.$el);
	},
};
</script>
