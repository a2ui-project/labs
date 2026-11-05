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

import React, {useEffect, useState} from 'react';

import classes from './Key.module.css';

function title(str) {
  if (str.length > 0) {
    return str[0].toUpperCase() + str.slice(1).toLowerCase();
  }
  return '';
}

function detectMac() {
  return /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);
}

function transform(mod, isMacLike) {
  if (isMacLike) {
    return mod;
  }

  switch (mod.toLowerCase()) {
    case 'cmd':
      return 'ctrl';
    default:
      return mod;
  }
}

const arrows = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
};

export default function Key({mod, fixed, mods = [], k, arrow}) {
  const [isMacLike, setMacLike] = useState(true);

  useEffect(() => {
    setMacLike(detectMac());
  }, []);

  if (mod) {
    mods = mod.split(' ');
  }

  if (arrow) {
    k = arrows[arrow];
  }

  mods = mods.map(mod => (fixed ? mod : transform(mod, isMacLike))).map(title);

  const keys = [...mods, title(k)];

  return (
    <div style={{display: 'inline-flex'}}>
      {keys.map((key, idx) => (
        <div key={idx} className={classes.key} style={{marginLeft: idx === 0 ? 0 : '0.25rem'}}>
          {key}
        </div>
      ))}
    </div>
  );
}
