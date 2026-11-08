import { describe, expect, it } from "vitest";
import { readEvents } from "../../src/shared/calendar";
import { cleanRoom, cleanTitle, detectCode, formatTeacher } from "../../src/shared/extract";
import { ade } from "../fixtures";

const events = readEvents(ade);
const byUid = (uid: string) => events.find((e) => e.uid === uid)!;

describe("helpers", () => {
  it("detects course codes", () => {
    expect(detectCode("HAI101I Portail Info GrC")).toBe("HAI101I");
    expect(detectCode("HAI107I2 Info GrC")).toBe("HAI107I2");
    expect(detectCode("HAI-302I BDD")).toBe("HAI302I");
    expect(detectCode("S1 Mentorat Informatique L1")).toBe("");
    expect(detectCode("04092026 - SPORT")).toBe("");
  });

  it("formats teachers", () => {
    expect(formatTeacher("DUPONT   JEAN")).toBe("Jean Dupont");
    expect(formatTeacher("DE LA FONTAINE   ANNE-MARIE")).toBe("Anne-Marie De La Fontaine");
  });

  it("cleans rooms", () => {
    expect(cleanRoom("TD 5.203")).toBe("Salle 5.203");
    expect(cleanRoom("TD36.303")).toBe("Salle 36.303");
    expect(cleanRoom("Tdinfo 36.205")).toBe("Salle info 36.205");
    expect(cleanRoom("TD info 5.128")).toBe("Salle info 5.128");
    expect(cleanRoom("Amphi 5.01")).toBe("Amphi 5.01");
    expect(cleanRoom("Pas de salle")).toBeNull();
    expect(cleanRoom("SC25.01")).toBe("SC25.01");
  });

  it("cleans titles", () => {
    expect(cleanTitle("S1 CAPSciences Informatique L1 Gr C, D, E et F")).toBe("S1 CAPSciences Informatique L1");
    expect(cleanTitle("02092026 - Visite Campus L1 Info Gr C")).toBe("Visite Campus L1 Info");
    expect(cleanTitle("HAI105X GrC")).toBe("");
  });
});

describe("extractEvent", () => {
  it("reads a lecture shared by many groups", () => {
    const e = byUid("ADEevent-0001");
    expect(e).toMatchObject({
      key: "HAI101I",
      code: "HAI101I",
      courseName: "Algorithmique 1",
      type: "CM",
      rooms: ["Amphi 5.01"],
      teachers: ["Jean Dupont"],
      notes: [],
    });
    expect(e.groups).toEqual(["INFO GR A", "INFO GR B", "INFO GR C", "Portail Maths", "Double L1 Info Maths"]);
  });

  it("tells TD and TP apart from the room", () => {
    expect(byUid("ADEevent-0002")).toMatchObject({ key: "HAI101I", type: "TD", rooms: ["Salle 5.202"] });
    expect(byUid("ADEevent-0003")).toMatchObject({ key: "HAI101I", type: "TP", rooms: ["Salle info 36.204"] });
  });

  it("handles events without course name or teacher", () => {
    expect(byUid("ADEevent-0005")).toMatchObject({
      key: "S1 Mentorat Informatique L1",
      courseName: "S1 Mentorat Informatique L1",
      teachers: [],
    });
    expect(byUid("ADEevent-0007")).toMatchObject({ key: "SPORT", type: "Autre", rooms: [] });
  });

  it("splits multiple rooms and formats compound names", () => {
    expect(byUid("ADEevent-0006")).toMatchObject({
      rooms: ["Amphi 5.06", "Amphi 5.01"],
      teachers: ["Anne-Marie De La Fontaine"],
    });
  });
});
