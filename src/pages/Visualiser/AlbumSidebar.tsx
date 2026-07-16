import type { AlbumResolverResult, ResolvedAlbumTrack } from './hooks/useAlbumResolver';
import type { PlaybackStatus } from './hooks/useAlbumAudioEngine';

interface AlbumSidebarProps {
  resolver: AlbumResolverResult;
  activeIndex: number;
  status: PlaybackStatus;
  onSelectTrack: (index: number) => void;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function AlbumSidebar({ resolver, activeIndex, status, onSelectTrack }: AlbumSidebarProps) {
  const { album, tracks } = resolver;
  if (!album) return null;

  return (
    <aside className="alb-sidebar" aria-label="Album information">
      <div className="alb-sidebar__cover">
        <img src={album.coverUrl} alt={`${album.title} cover art`} />
      </div>

      <div className="alb-sidebar__info">
        <h1 className="alb-sidebar__title">{album.title}</h1>
        {album.subtitle && <p className="alb-sidebar__subtitle">{album.subtitle}</p>}
        <p className="alb-sidebar__artist">{album.artist}</p>
        <div className="alb-sidebar__meta">
          <span>{album.releaseDate}</span>
          {album.genres && album.genres.length > 0 && (
            <span className="alb-sidebar__genres">
              {album.genres.join(' · ')}
            </span>
          )}
          {album.model && album.modelVersion && (
            <span className="alb-sidebar__model">{album.model} {album.modelVersion}</span>
          )}
        </div>
      </div>

      {album.description && (
        <div className="alb-sidebar__description">
          <p>{album.description}</p>
        </div>
      )}

      <nav className="alb-sidebar__tracklist" aria-label="Track list">
        <ol className="alb-tracklist">
          {tracks.filter(t => !t.albumTrack.hidden).map((track, visibleIdx) => {
            const realIndex = tracks.indexOf(track);
            const isActive = realIndex === activeIndex;
            const isPlaying = isActive && (status === 'playing' || status === 'loading' || status === 'buffering');

            return (
              <li key={`${track.albumTrack.trackId}-${track.albumTrack.trackNumber}`}>
                <button
                  type="button"
                  className={`alb-tracklist__btn${isActive ? ' is-active' : ''}${isPlaying ? ' is-playing' : ''}`}
                  onClick={() => onSelectTrack(realIndex)}
                  disabled={!track.available}
                  aria-current={isActive ? 'true' : undefined}
                  aria-label={`Track ${track.albumTrack.trackNumber}: ${track.title}${!track.available ? ' (unavailable)' : ''}`}
                >
                  <span className="alb-tracklist__num">{track.albumTrack.trackNumber}</span>
                  <span className="alb-tracklist__title">{track.title}</span>
                  {track.albumTrack.bonus && <span className="alb-tracklist__badge">Bonus</span>}
                  <span className="alb-tracklist__duration">{fmt(track.duration)}</span>
                  {isPlaying && <span className="alb-tracklist__indicator" aria-hidden="true">◈</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </aside>
  );
}
