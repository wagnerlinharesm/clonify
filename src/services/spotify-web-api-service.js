import axios from "axios";
import faker from "faker";
import sanitizeHTML from "sanitize-html";
import { Album } from "../entities/album";
import { FriendActivity } from "../entities/friend-activity";
import { Playlist } from "../entities/playlist";
import { Podcast } from "../entities/podcast";
import { Song } from "../entities/song";
import { User } from "../entities/user";
import { getToken } from "./authentication";

const SPOTIFY_BASE_URL = "https://api.spotify.com/v1";

const fetchFromApi = async (endpoint) =>
  axios
    .create({
      baseURL: SPOTIFY_BASE_URL,
      headers: {
        Authorization: "Bearer " + getToken(),
      },
    })
    .get(endpoint)
    .then((response) => response.data);

export async function getCurrentUser() {
  const userData = await fetchFromApi("/me");
  const name = userData.display_name;
  const avatarUrl = userData.images[0].url;
  const id = userData.id;

  return new User({ name, avatarUrl, id });
}

export async function getUserPlaylists(userId) {
  const data = await fetchFromApi(`/users/${userId}/playlists`);
  const playlistsData = Array.from(data.items);

  return playlistsData.map(
    ({ images, name, tracks, id, description, followersNumber }) => {
      const imagesUrl = images.map((img) => img.url);
      const tracksIds = tracks;

      return new Playlist({
        name,
        covers: imagesUrl,
        tracksIds,
        id,
        description: sanitizeHTML(description, { allowedTags: [] }),
        followersNumber,
        isLiked: true,
      });
    }
  );
}

export async function getFriendsActivity() {
  const getFakeFriend = () =>
    new User({
      name: faker.name.findName(),
      avatarUrl: faker.internet.avatar(),
      id: faker.random.uuid(),
    });

  const randomTracksRef = await fetchFromApi(
    "/browse/categories/toplists/playlists"
  )
    .then((response) => {
      const playlists = response.playlists.items;
      const randomIndex = Math.floor(Math.random() * playlists.length);
      return playlists[randomIndex];
    })
    .then((playlist) => playlist.tracks.href);

  const fullTracksData = await fetchFromApi(randomTracksRef).then(
    (response) => response.items
  );

  const fakeActivities = fullTracksData
    .map((data) => data.track)
    .map((track) => {
      const friend = getFakeFriend();
      const { name: title, preview_url: sourceUrl } = track;
      const { album: albumData } = track;
      const { name: currentAlbumName, id: albumId } = albumData;
      const { id: artistId, name: currentArtistName } = albumData.artists[0];
      const currentSong = new Song({ title, artistId, albumId, sourceUrl });
      const activity = new FriendActivity({
        friend,
        currentAlbumName,
        currentSong,
        currentArtistName,
      });

      return activity;
    });

  return fakeActivities;
}

export async function getRecentPlayed(userId) {
  const contextsEndpoint = "/me/player/recently-played?limit=50";
  const recentContextsUrls = await fetchFromApi(contextsEndpoint)
    .then((data) => data.items)
    .then((items) => items.map((el) => el.context))
    .then((contexts) =>
      contexts.flatMap((ctx) =>
        ctx && (ctx.type === "album" || ctx.type === "playlist")
          ? [ctx.href]
          : []
      )
    )
    .then((contexts) => Array.from(new Set(contexts)));

  const recentPlayedData = await Promise.all(
    recentContextsUrls.map((url) =>
      fetchFromApi(url.replace(SPOTIFY_BASE_URL, "")).then(async (data) => {
        const id = data.id;
        const checkLikeEndpoint =
          data.type === "album"
            ? `/me/albums/contains?ids=${id}`
            : `/playlists/${id}/followers/contains?ids=${userId}`;

        const [isLiked] = await fetchFromApi(checkLikeEndpoint);
        return {
          ...data,
          isLiked,
        };
      })
    )
  );

  const recentPlayed = recentPlayedData.map((data) => {
    const id = data.id;
    const name = data.name;
    const covers = data.images.map((el) => el.url);
    const isLiked = data.isLiked;

    if (data.type === "playlist") {
      return new Playlist({
        id,
        name,
        covers,
        isLiked,
        followersNumber: data.followers.total,
        tracksIds: data.tracks.items.map((el) => el.track.id),
        description: sanitizeHTML(data.description, { allowedTags: [] }),
      });
    }

    return new Album({
      covers,
      id,
      isLiked,
      name,
      artistsIds: data.artists.map((el) => el.id),
      artistsNames: data.artists.map((el) => el.name),
      tracksIds: data.tracks.items.map((el) => el.id),
    });
  });

  return recentPlayed;
}

export async function getUserPodcasts() {
  const endpoint = "/me/shows";
  const podcastsData = await fetchFromApi(endpoint).then((data) =>
    data.items.map((el) => el.show)
  );

  return podcastsData.map(
    (data) =>
      new Podcast({
        covers: data.images.map((el) => el.url),
        description: data.description,
        id: data.id,
        name: data.name,
        publisher: data.publisher,
      })
  );
}
