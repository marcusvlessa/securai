export interface GeoLocationInfo {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  mobile: boolean;
  proxy: boolean;
  hosting: boolean;
  query: string;
}

export interface CachedGeoInfo extends GeoLocationInfo {
  cachedAt: number;
}

class GeoLocationService {
  private cache = new Map<string, CachedGeoInfo>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

  async getLocationInfo(ip: string): Promise<GeoLocationInfo | null> {
    // Verificar cache primeiro
    const cached = this.cache.get(ip);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_DURATION) {
      return cached;
    }

    try {
      // Tentar IP-API primeiro (gratuito, sem necessidade de chave)
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,mobile,proxy,hosting,query`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'fail') {
        console.warn(`GeoLocation failed for IP ${ip}: ${data.message}`);
        return null;
      }

      const geoInfo: GeoLocationInfo = {
        ip: data.query,
        country: data.country || 'Desconhecido',
        countryCode: data.countryCode || 'XX',
        region: data.region || '',
        regionName: data.regionName || 'Desconhecido',
        city: data.city || 'Desconhecido',
        zip: data.zip || '',
        lat: data.lat || 0,
        lon: data.lon || 0,
        timezone: data.timezone || '',
        isp: data.isp || 'Desconhecido',
        org: data.org || 'Desconhecido',
        as: data.as || '',
        mobile: data.mobile || false,
        proxy: data.proxy || false,
        hosting: data.hosting || false,
        query: data.query
      };

      // Armazenar no cache
      const cachedInfo: CachedGeoInfo = {
        ...geoInfo,
        cachedAt: Date.now()
      };
      this.cache.set(ip, cachedInfo);

      return geoInfo;
    } catch (error) {
      console.error(`Erro ao obter geolocalização para IP ${ip}:`, error);
      
      // Fallback para ipapi.co se ip-api falhar
      try {
        const fallbackResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!fallbackResponse.ok) {
          throw new Error(`Fallback API error! status: ${fallbackResponse.status}`);
        }

        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData.error) {
          console.warn(`Fallback GeoLocation failed for IP ${ip}: ${fallbackData.reason}`);
          return null;
        }

        const fallbackGeoInfo: GeoLocationInfo = {
          ip: ip,
          country: fallbackData.country_name || 'Desconhecido',
          countryCode: fallbackData.country_code || 'XX',
          region: fallbackData.region_code || '',
          regionName: fallbackData.region || 'Desconhecido',
          city: fallbackData.city || 'Desconhecido',
          zip: fallbackData.postal || '',
          lat: fallbackData.latitude || 0,
          lon: fallbackData.longitude || 0,
          timezone: fallbackData.timezone || '',
          isp: fallbackData.org || 'Desconhecido',
          org: fallbackData.org || 'Desconhecido',
          as: fallbackData.asn || '',
          mobile: false,
          proxy: false,
          hosting: false,
          query: ip
        };

        // Armazenar no cache
        const cachedFallbackInfo: CachedGeoInfo = {
          ...fallbackGeoInfo,
          cachedAt: Date.now()
        };
        this.cache.set(ip, cachedFallbackInfo);

        return fallbackGeoInfo;
      } catch (fallbackError) {
        console.error(`Erro no fallback de geolocalização para IP ${ip}:`, fallbackError);
        return null;
      }
    }
  }

  async getMultipleLocations(ips: string[]): Promise<Map<string, GeoLocationInfo | null>> {
    const results = new Map<string, GeoLocationInfo | null>();
    
    // Processar em lotes para evitar rate limiting
    const batchSize = 10;
    for (let i = 0; i < ips.length; i += batchSize) {
      const batch = ips.slice(i, i + batchSize);
      const batchPromises = batch.map(async (ip) => {
        const info = await this.getLocationInfo(ip);
        return { ip, info };
      });
      
      try {
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ ip, info }) => {
          results.set(ip, info);
        });
        
        // Pequeno delay entre lotes para evitar rate limiting
        if (i + batchSize < ips.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error('Erro ao processar lote de IPs:', error);
        // Continuar com o próximo lote mesmo se um falhar
        batch.forEach(ip => results.set(ip, null));
      }
    }
    
    return results;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; oldestEntry: number | null } {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.cachedAt)) : null
    };
  }
}

export const geoLocationService = new GeoLocationService();