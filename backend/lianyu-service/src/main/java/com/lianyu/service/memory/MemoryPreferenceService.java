package com.lianyu.service.memory;

import com.lianyu.dao.entity.Character;
import com.lianyu.dao.mapper.CharacterMapper;
import com.lianyu.service.character.CharacterPreferenceResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MemoryPreferenceService {

    private final CharacterMapper characterMapper;

    public boolean isEnabled(Long userId, Long characterId) {
        if (userId == null || characterId == null) {
            return false;
        }
        Character character = characterMapper.selectById(characterId);
        return character != null
                && userId.equals(character.getOwnerUserId())
                && CharacterPreferenceResolver.memoryEnabled(character.getSettings());
    }
}
