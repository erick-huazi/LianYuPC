package com.lianyu.service.relationship;

public record RelationshipInnerSpace(String headline, String body) {

    public static RelationshipInnerSpace defaultSpace() {
        return new RelationshipInnerSpace(
                "她还在慢慢熟悉与你相处的节奏。",
                "她对这段关系还保持着温柔的试探，正在从每一次对话里确认与你靠近的方式。");
    }
}
