/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ReactElement } from 'react';

type DownloadLink = {
  label: string;
  url: string;
};

type DownloadCardProps = {
  icon: ReactElement;
  platform: string;
  links: DownloadLink[];
};

export function DownloadCard({ icon, platform, links }: DownloadCardProps) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '1.5rem',
        border: '1px solid var(--ifm-color-emphasis-500)',
        borderRadius: '8px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100px',
          marginBottom: '1rem',
        }}
      >
        {icon}
      </div>
      <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>{platform}</h3>
      {links.map(link => (
        <a
          key={link.url}
          href={link.url}
          style={{ display: 'block', marginTop: '0.5rem' }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
