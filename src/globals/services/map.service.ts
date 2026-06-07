import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class MapService {
  private trials = +env('MAP_TRIALS');
  private origin: string;
  private destination: string;

  async getTripDetails(origin: string, destination: string) {
    this.origin = origin.replaceAll(',', ', ');
    this.destination = destination.replaceAll(',', ', ');

    try {
      const config = {
        method: 'get',
        url: 'https://maps.googleapis.com/maps/api/distancematrix/json',
        params: {
          origins: this.origin,
          destinations: this.destination,
          key: env('MAP_API_KEY'),
        },
      };
      const tripDetails = await axios<TripDetails>(config);
      if (!tripDetails.data?.rows?.at(0))
        throw new BadRequestException('invalid request with 200');
      return tripDetails.data;
    } catch (error) {
      catchHandler(error);
    }
  }
}
