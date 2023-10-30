import { LocalVideoTrack, RemoteVideoTrack } from 'livekit-client';
import { FC, useEffect, useRef } from 'react';

interface OvVideoProps {
	track: LocalVideoTrack | RemoteVideoTrack;
	onClick?: () => void;
}

const OvVideo: FC<OvVideoProps> = ({ track, onClick }) => {
	const videoRef: React.MutableRefObject<null | HTMLVideoElement> = useRef(null);

	useEffect(() => {
		if (videoRef.current) {
			track.attach(videoRef.current);
		}
	}, [track]);

	return <video onClick={onClick} ref={videoRef} playsInline autoPlay={true} />;
};

export default OvVideo;
