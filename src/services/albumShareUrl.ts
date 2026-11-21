const ALBUM_VIEW_ORIGIN = 'https://guestalbum.vercel.app'

export function getAlbumViewUrl(functionUrl: string): string {
  let token: string | undefined

  try {
    token = new URL(functionUrl).pathname.match(/^\/album\/([^/]+)\/?$/)?.[1]
  } catch {
    token = functionUrl.match(/\/album\/([^/?#]+)/)?.[1]
  }

  if (!token) throw new Error('The album share link did not contain a valid token.')

  return `${ALBUM_VIEW_ORIGIN}/album/${token}`
}
