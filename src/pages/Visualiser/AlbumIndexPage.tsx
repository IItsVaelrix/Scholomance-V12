import { Link } from 'react-router-dom';
import { GRIMOIRE_ALBUMS } from './tracks/albums';
import './AlbumPage.css';

export default function AlbumIndexPage() {
  const visibleAlbums = GRIMOIRE_ALBUMS.filter(a => a.status !== 'draft');

  return (
    <main className="alb-page alb-index" aria-label="Albums">
      <header className="alb-index__header">
        <h1>Albums</h1>
        <Link to="/visualiser" className="alb-index__back">← Visualiser</Link>
      </header>

      <div className="alb-index__grid">
        {visibleAlbums.map(album => (
          <Link
            key={album.id}
            to={`/visualiser/album/${album.id}`}
            className="alb-index__card"
          >
            <img
              src={album.coverUrl}
              alt={`${album.title} cover`}
              className="alb-index__cover"
            />
            <div className="alb-index__info">
              <h2 className="alb-index__title">{album.title}</h2>
              <p className="alb-index__artist">{album.artist}</p>
              <p className="alb-index__meta">
                {album.releaseDate} · {album.tracks.length} tracks
              </p>
              {album.genres && album.genres.length > 0 && (
                <p className="alb-index__genres">{album.genres.join(' · ')}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
