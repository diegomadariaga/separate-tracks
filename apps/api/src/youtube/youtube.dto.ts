import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class DownloadYoutubeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}(&.*)?$/i, {
    message: 'URL de YouTube no válida'
  })
  url!: string;
}
