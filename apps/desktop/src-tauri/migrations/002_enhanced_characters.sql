-- Enhanced Character System Migration
-- Adds JanitorAI-style character fields

-- Scenario: The context/setting for the character
ALTER TABLE characters ADD COLUMN scenario TEXT NOT NULL DEFAULT '';

-- Backstory: Character's background/history
ALTER TABLE characters ADD COLUMN backstory TEXT NOT NULL DEFAULT '';

-- Likes: JSON array of things the character likes
ALTER TABLE characters ADD COLUMN likes TEXT NOT NULL DEFAULT '[]';

-- Dislikes: JSON array of things the character dislikes
ALTER TABLE characters ADD COLUMN dislikes TEXT NOT NULL DEFAULT '[]';

-- Physical traits: How the character physically behaves, mannerisms
ALTER TABLE characters ADD COLUMN physical_traits TEXT NOT NULL DEFAULT '';

-- Speech patterns: How the character talks (accent, phrases, style)
ALTER TABLE characters ADD COLUMN speech_patterns TEXT NOT NULL DEFAULT '';

-- Alternate greetings: JSON array of additional first messages
ALTER TABLE characters ADD COLUMN alternate_greetings TEXT NOT NULL DEFAULT '[]';

-- Creator attribution
ALTER TABLE characters ADD COLUMN creator_name TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN creator_notes TEXT NOT NULL DEFAULT '';
ALTER TABLE characters ADD COLUMN character_version TEXT NOT NULL DEFAULT '';

-- Category tags
-- pov_type: 'any', 'first', 'second', 'third'
ALTER TABLE characters ADD COLUMN pov_type TEXT NOT NULL DEFAULT 'any';

-- rating: 'sfw', 'nsfw', 'limitless'
ALTER TABLE characters ADD COLUMN rating TEXT NOT NULL DEFAULT 'sfw';

-- genre_tags: JSON array like ['comedy', 'romance', 'drama']
ALTER TABLE characters ADD COLUMN genre_tags TEXT NOT NULL DEFAULT '[]';
