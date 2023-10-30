import { LocalAudioTrack, RemoteAudioTrack } from 'livekit-client';
import { FC, useEffect, useRef } from 'react';

interface OvAudioProps {
	track: LocalAudioTrack | RemoteAudioTrack;
}

const OvAudio: FC<OvAudioProps> = ({ track }) => {
	const audioRef: React.MutableRefObject<null | HTMLAudioElement> =
		useRef(null);

	useEffect(() => {
		if (audioRef.current) {
			track.attach(audioRef.current);
		}
	}, [track]);

	return <audio ref={audioRef} playsInline autoPlay={true} />;
};

export default OvAudio;
