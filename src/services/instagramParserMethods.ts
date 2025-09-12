// Additional parsing methods for Meta Business Record sections

import { InstagramProfile, InstagramDevice, InstagramLogin, InstagramFollowing, ThreadsPost, NCMECReport, RequestParameter, CaseMetadata } from './instagramParserService';

export class InstagramParserMethods {
  
  static parseRequestParameters(doc: Document): RequestParameter[] {
    const parameters: RequestParameter[] = [];
    
    const section = this.findSectionByHeader(doc, ['Request Parameters', 'Parameters', 'Request Info']);
    if (!section) return parameters;
    
    const tables = section.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, index) => {
        if (index === 0) return; // Skip header
        
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 2) {
          parameters.push({
            parameterName: cells[0]?.textContent?.trim() || '',
            value: cells[1]?.textContent?.trim() || '',
            category: 'request',
            timestamp: new Date()
          });
        }
      });
    });
    
    console.log(`Found ${parameters.length} request parameters`);
    return parameters;
  }

  static parseNCMECReports(doc: Document): NCMECReport[] {
    const reports: NCMECReport[] = [];
    
    const section = this.findSectionByHeader(doc, ['NCMEC Reports', 'NCMEC', 'Reports']);
    if (!section) return reports;
    
    const tables = section.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, index) => {
        if (index === 0) return; // Skip header
        
        const cells = row.querySelectorAll('td, th');
        if (cells.length >= 3) {
          reports.push({
            id: cells[0]?.textContent?.trim() || `report_${index}`,
            reportDate: this.parseTimestamp(cells[1]?.textContent?.trim() || ''),
            contentType: cells[2]?.textContent?.trim() || '',
            status: cells[3]?.textContent?.trim() || 'unknown',
            description: cells[4]?.textContent?.trim()
          });
        }
      });
    });
    
    console.log(`Found ${reports.length} NCMEC reports`);
    return reports;
  }

  static parseProfileSection(doc: Document): InstagramProfile | null {
    const section = this.findSectionByHeader(doc, ['Profile', 'Account Information', 'User Information', 'Profile Picture']);
    if (!section) return null;
    
    const profile: Partial<InstagramProfile> = {
      email: [],
      phone: [],
      accountStatus: 'active',
      verificationStatus: 'unverified'
    };
    
    // Parse profile data from tables or key-value pairs
    const rows = section.querySelectorAll('tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      if (cells.length >= 2) {
        const key = cells[0]?.textContent?.trim().toLowerCase() || '';
        const value = cells[1]?.textContent?.trim() || '';
        
        if (key.includes('username')) profile.username = value;
        else if (key.includes('display') || key.includes('name')) profile.displayName = value;
        else if (key.includes('email')) profile.email?.push(value);
        else if (key.includes('phone')) profile.phone?.push(value);
        else if (key.includes('status')) profile.accountStatus = value as any;
        else if (key.includes('verified')) profile.verificationStatus = value.toLowerCase().includes('yes') ? 'verified' : 'unverified';
        else if (key.includes('business')) profile.businessAccount = value.toLowerCase().includes('yes');
        else if (key.includes('registration')) {
          if (key.includes('date')) profile.registrationDate = this.parseTimestamp(value);
          else if (key.includes('ip')) profile.registrationIP = value;
        }
      }
    });
    
    // Ensure required fields
    if (!profile.username) return null;
    
    console.log(`Found profile for: ${profile.username}`);
    return profile as InstagramProfile;
  }

  static parsePhotosSection(doc: Document, mediaFiles: Map<string, Blob>): any[] {
    const photos: any[] = [];
    
    const section = this.findSectionByHeader(doc, ['Photos', 'Images', 'Profile Picture']);
    if (!section) return photos;
    
    const images = section.querySelectorAll('img');
    images.forEach((img, index) => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      
      photos.push({
        id: `photo_${index}`,
        src,
        alt,
        type: 'profile_photo'
      });
    });
    
    console.log(`Found ${photos.length} photos`);
    return photos;
  }

  static parseDisappearingMessages(doc: Document, mediaFiles: Map<string, Blob>): any[] {
    const messages: any[] = [];
    
    const section = this.findSectionByHeader(doc, ['Reported Disappearing Messages', 'Disappearing Messages']);
    if (!section) return messages;
    
    const tables = section.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, index) => {
        if (index === 0) return; // Skip header
        
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          messages.push({
            id: `disappearing_${index}`,
            timestamp: this.parseTimestamp(cells[0]?.textContent?.trim() || ''),
            sender: cells[1]?.textContent?.trim() || '',
            content: cells[2]?.textContent?.trim() || '',
            type: 'disappearing'
          });
        }
      });
    });
    
    console.log(`Found ${messages.length} disappearing messages`);
    return messages;
  }

  static parseThreadsPosts(doc: Document): ThreadsPost[] {
    const posts: ThreadsPost[] = [];
    
    const section = this.findSectionByHeader(doc, ['Threads Posts And Replies', 'Threads Posts', 'Threads']);
    if (!section) return posts;
    
    const tables = section.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, index) => {
        if (index === 0) return; // Skip header
        
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          posts.push({
            id: `threads_${index}`,
            content: cells[0]?.textContent?.trim() || '',
            timestamp: this.parseTimestamp(cells[1]?.textContent?.trim() || ''),
            reactions: 0,
            replies: 0,
            shares: 0,
            mediaAttached: false,
            visibility: 'public'
          });
        }
      });
    });
    
    console.log(`Found ${posts.length} Threads posts`);
    return posts;
  }

  static parseDevices(doc: Document): InstagramDevice[] {
    const devices: InstagramDevice[] = [];
    
    const section = this.findSectionByHeader(doc, ['Devices', 'Device Information', 'Login Devices']);
    if (!section) return devices;
    
    const tables = section.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, index) => {
        if (index === 0) return; // Skip header
        
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          devices.push({
            uuid: cells[0]?.textContent?.trim() || `device_${index}`,
            type: cells[1]?.textContent?.trim() || 'unknown',
            deviceModel: cells[2]?.textContent?.trim(),
            status: 'active',
            lastSeen: this.parseTimestamp(cells[3]?.textContent?.trim() || '')
          });
        }
      });
    });
    
    console.log(`Found ${devices.length} devices`);
    return devices;
  }

  static parseLogins(doc: Document): InstagramLogin[] {
    const logins: InstagramLogin[] = [];
    
    const section = this.findSectionByHeader(doc, ['Login History', 'Logins', 'Access History']);
    if (!section) return logins;
    
    const tables = section.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, index) => {
        if (index === 0) return; // Skip header
        
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          logins.push({
            timestamp: this.parseTimestamp(cells[0]?.textContent?.trim() || ''),
            ip: cells[1]?.textContent?.trim() || '',
            location: cells[2]?.textContent?.trim(),
            device: cells[3]?.textContent?.trim(),
            success: true
          });
        }
      });
    });
    
    console.log(`Found ${logins.length} login records`);
    return logins;
  }

  static parseFollowing(doc: Document): InstagramFollowing[] {
    const following: InstagramFollowing[] = [];
    
    const section = this.findSectionByHeader(doc, ['Following', 'Followers', 'Connections']);
    if (!section) return following;
    
    const tables = section.querySelectorAll('table');
    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      rows.forEach((row, index) => {
        if (index === 0) return; // Skip header
        
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2) {
          following.push({
            username: cells[0]?.textContent?.trim() || '',
            displayName: cells[1]?.textContent?.trim(),
            followDate: this.parseTimestamp(cells[2]?.textContent?.trim() || ''),
            followType: 'following'
          });
        }
      });
    });
    
    console.log(`Found ${following.length} following relationships`);
    return following;
  }

  static extractCaseMetadata(doc: Document): CaseMetadata | undefined {
    const metadata: Partial<CaseMetadata> = {};
    
    // Look for date range information
    const dateRangeText = doc.body.textContent || '';
    const dateRangeMatch = dateRangeText.match(/Date Range: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC to (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC/);
    
    if (dateRangeMatch) {
      metadata.dateRange = {
        start: new Date(dateRangeMatch[1]),
        end: new Date(dateRangeMatch[2])
      };
    }
    
    // Look for generation date
    const generationMatch = dateRangeText.match(/Date Generated: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) UTC/);
    if (generationMatch) {
      metadata.generationDate = new Date(generationMatch[1]);
    }
    
    // Look for preservation information
    const preservationMatch = dateRangeText.match(/Preservation-(\d+)/);
    if (preservationMatch) {
      metadata.preservationId = preservationMatch[0];
    }
    
    metadata.reportType = 'Meta Business Record';
    
    if (!metadata.dateRange || !metadata.generationDate) return undefined;
    
    return metadata as CaseMetadata;
  }

  // Helper methods
  static findSectionByHeader(doc: Document, headerTexts: string[]): Element | null {
    const headers = doc.querySelectorAll('h1, h2, h3, h4, .section-header, strong, b');
    
    for (const header of headers) {
      const text = header.textContent?.trim();
      if (text && headerTexts.some(headerText => text.includes(headerText))) {
        // Find the section that contains this header
        let current = header.parentElement;
        while (current) {
          if (current.querySelector('table, .message, .conversation')) {
            return current;
          }
          current = current.parentElement;
        }
        // If no section found, use next element
        return header.nextElementSibling;
      }
    }
    
    return null;
  }

  static parseTimestamp(timestampStr: string): Date {
    if (!timestampStr) return new Date();
    
    // Try different timestamp formats
    const formats = [
      /(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})/, // 2024-01-01 12:00:00
      /(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/, // 01/01/2024 12:00
      /(\d{2})\/(\d{2})\/(\d{4})/, // 01/01/2024
      /(\d{4})-(\d{2})-(\d{2})/ // 2024-01-01
    ];
    
    for (const format of formats) {
      const match = timestampStr.match(format);
      if (match) {
        try {
          return new Date(timestampStr);
        } catch {
          // Continue to next format
        }
      }
    }
    
    // Fallback
    try {
      return new Date(timestampStr);
    } catch {
      return new Date();
    }
  }
}