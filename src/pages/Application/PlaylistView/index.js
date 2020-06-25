import React, { useContext, useEffect, useState } from "react";
import { BsHeartFill, BsThreeDots } from "react-icons/bs";
import { FaRegPlayCircle } from "react-icons/fa";
import { RiCalendar2Line } from "react-icons/ri";
import { useInView } from "react-intersection-observer";
import { useParams } from "react-router-dom";
import { ContentLoadingAnimation } from "../../../components/ContentLoadingAnimation";
import { HeaderPlaylistView } from "../../../components/HeaderPlaylistView";
import { CurrentPlayingContext } from "../../../providers/current-playing-context";
import { TrackQueueContext } from "../../../providers/track-queue-context";
import { getPlaylistFromAPI } from "../../../services/get-playlist-from-api";
import { AnimationContainer, Container } from "./styles";

export function PlaylistView() {
  const [ref, isSentinelInView] = useInView({ threshold: 0 });
  const { id } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [, setQueue] = useContext(TrackQueueContext);
  const [currentTrack, setCurrentTrack] = useContext(CurrentPlayingContext);

  useEffect(() => {
    getPlaylistFromAPI(id)
      .then((playlist) => setPlaylist(playlist))
      .catch((err) => console.error(err));
  }, [id]);

  const handleTrackClick = (track) => {
    setQueue(playlist.tracks);
    setCurrentTrack(track);
  };

  const isActive = (track) => (track.id === currentTrack.id ? "true" : "false");

  return playlist === null ? (
    <AnimationContainer>
      <ContentLoadingAnimation />
    </AnimationContainer>
  ) : (
    <Container>
      <div ref={ref} className="sticky-guard"></div>
      <HeaderPlaylistView
        cover={playlist.cover}
        creatorName="Felipe Tomaz"
        description={playlist.description}
        name={playlist.name}
        numberOfFollowers={playlist.followersNumber}
        numberOfSongs={playlist.tracks.length}
        timeLength={9000000}
        compact={!isSentinelInView}
      />
      <section className="tracks-section">
        <table className="tracks-table">
          <thead>
            <tr>
              <th />
              <th />
              <th>Title</th>
              <th>Artist</th>
              <th>
                <RiCalendar2Line />
              </th>
            </tr>
          </thead>

          <tbody>
            {playlist.tracks.map((track) => (
              <tr key={track.id} active={isActive(track)}>
                <td className="col-play-button">
                  <button onClick={() => handleTrackClick(track)}>
                    <FaRegPlayCircle size={25} />
                  </button>
                </td>
                <td className="col-like-button">
                  <button>
                    <BsHeartFill size={15} />
                  </button>
                </td>
                <td className="col-title">{track.title}</td>
                <td className="col-artist">
                  {track.artists.map((a) => a.name).join(", ")}
                </td>
                <td className="col-more-button">
                  <button>
                    <BsThreeDots size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Container>
  );
}
