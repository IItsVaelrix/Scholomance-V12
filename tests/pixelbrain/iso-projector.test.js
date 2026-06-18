import { describe, it, expect } from 'vitest';
import {
  ISO_TILE_SIZE,
  project,
  makeFace,
  collectFaces,
  renderBounds,
} from '../../codex/core/pixelbrain/iso-projector.js';
import {
  createVoxelVolume,
  getCellMaterialId,
  isCellOccupied,
  setCellMaterial,
} from '../../codex/core/pixelbrain/voxel-volume.js';

describe('iso-projector', () => {
  describe('project', () => {
    it('projects origin (0,0,0) to screen origin', () => {
      const result = project(0, 0, 0);
      expect(result).toEqual({ sx: 0, sy: 0 });
    });

    it('projects (1,0,0) to isometric right', () => {
      const result = project(1, 0, 0);
      expect(result).toEqual({ sx: ISO_TILE_SIZE, sy: ISO_TILE_SIZE / 2 });
      expect(result).toEqual({ sx: 16, sy: 8 });
    });

    it('projects (0,0,1) to isometric left', () => {
      const result = project(0, 0, 1);
      expect(result).toEqual({ sx: -ISO_TILE_SIZE, sy: ISO_TILE_SIZE / 2 });
      expect(result).toEqual({ sx: -16, sy: 8 });
    });

    it('projects (0,1,0) upward in screen space', () => {
      const result = project(0, 1, 0);
      expect(result).toEqual({ sx: 0, sy: -ISO_TILE_SIZE });
      expect(result).toEqual({ sx: 0, sy: -16 });
    });

    it('projects (2,1,3) with manual calculation', () => {
      const result = project(2, 1, 3);
      // sx = (2-3)*16 = -16
      // sy = (2+3)*8 - 1*16 = 40 - 16 = 24
      expect(result).toEqual({ sx: -16, sy: 24 });
    });
  });

  describe('makeFace', () => {
    it('creates a top face with correct properties', () => {
      const face = makeFace(1, 2, 3, 'top', 4);
      expect(face).toEqual({
        x: 1,
        y: 2,
        z: 3,
        faceType: 'top',
        materialId: 4,
        sx: project(1, 2, 3).sx,
        sy: project(1, 2, 3).sy,
        sortKey: (3 + 2) * 10000 + 1 * 10 + 0,
      });
      expect(face.sortKey).toBe(50010);
    });

    it('creates a left face with faceTypeIndex=1', () => {
      const face = makeFace(0, 0, 0, 'left', 1);
      expect(face.faceType).toBe('left');
      expect(face.sortKey).toBe((0 + 0) * 10000 + 0 * 10 + 1);
      expect(face.sortKey).toBe(1);
    });

    it('creates a right face with faceTypeIndex=2', () => {
      const face = makeFace(0, 0, 0, 'right', 1);
      expect(face.faceType).toBe('right');
      expect(face.sortKey).toBe((0 + 0) * 10000 + 0 * 10 + 2);
      expect(face.sortKey).toBe(2);
    });

    it('maintains sort order: top < left < right for same (x,y,z)', () => {
      const top = makeFace(5, 5, 5, 'top', 1);
      const left = makeFace(5, 5, 5, 'left', 1);
      const right = makeFace(5, 5, 5, 'right', 1);
      expect(top.sortKey).toBeLessThan(left.sortKey);
      expect(left.sortKey).toBeLessThan(right.sortKey);
    });
  });

  describe('collectFaces', () => {
    it('returns empty array for empty volume', () => {
      const vol = createVoxelVolume(4, 4, 4);
      const faces = collectFaces(
        vol,
        (x, y, z) => getCellMaterialId(vol, x, y, z),
        (x, y, z) => isCellOccupied(vol, x, y, z)
      );
      expect(faces).toEqual([]);
    });

    it('returns 3 faces for single-cell volume', () => {
      const vol = createVoxelVolume(4, 4, 4);
      setCellMaterial(vol, 1, 1, 1, 4);

      const faces = collectFaces(
        vol,
        (x, y, z) => getCellMaterialId(vol, x, y, z),
        (x, y, z) => isCellOccupied(vol, x, y, z)
      );

      expect(faces).toHaveLength(3);
      expect(faces.every(f => f.x === 1 && f.y === 1 && f.z === 1)).toBe(true);
      expect(faces.every(f => f.materialId === 4)).toBe(true);
      const faceTypes = faces.map(f => f.faceType);
      expect(faceTypes).toContain('top');
      expect(faceTypes).toContain('left');
      expect(faceTypes).toContain('right');
    });

    it('sorts faces ascending by sortKey', () => {
      const vol = createVoxelVolume(4, 4, 4);
      setCellMaterial(vol, 1, 1, 1, 4);
      setCellMaterial(vol, 0, 0, 0, 4);

      const faces = collectFaces(
        vol,
        (x, y, z) => getCellMaterialId(vol, x, y, z),
        (x, y, z) => isCellOccupied(vol, x, y, z)
      );

      for (let i = 1; i < faces.length; i++) {
        expect(faces[i].sortKey).toBeGreaterThanOrEqual(faces[i - 1].sortKey);
      }
    });

    it('culls shared faces between adjacent occupied cells', () => {
      const vol = createVoxelVolume(4, 4, 4);
      // Place two cells side by side: (0,0,0) and (1,0,0)
      setCellMaterial(vol, 0, 0, 0, 4);
      setCellMaterial(vol, 1, 0, 0, 4);

      const faces = collectFaces(
        vol,
        (x, y, z) => getCellMaterialId(vol, x, y, z),
        (x, y, z) => isCellOccupied(vol, x, y, z)
      );

      // Cell (0,0,0): should NOT have a right face (x+1=1 is occupied)
      const cell0Faces = faces.filter(f => f.x === 0 && f.y === 0 && f.z === 0);
      expect(cell0Faces.map(f => f.faceType)).not.toContain('right');

      // Cell (1,0,0): should have a right face (x+1=2 is out of bounds)
      const cell1Faces = faces.filter(f => f.x === 1 && f.y === 0 && f.z === 0);
      expect(cell1Faces.map(f => f.faceType)).toContain('right');
    });

    it('emits top face when cell above is not occupied', () => {
      const vol = createVoxelVolume(4, 4, 4);
      setCellMaterial(vol, 1, 1, 1, 4);
      // Cell above (1,2,1) is not occupied
      const faces = collectFaces(
        vol,
        (x, y, z) => getCellMaterialId(vol, x, y, z),
        (x, y, z) => isCellOccupied(vol, x, y, z)
      );

      const topFaces = faces.filter(f => f.faceType === 'top');
      expect(topFaces.length).toBeGreaterThan(0);
    });

    it('suppresses top face when cell above is occupied', () => {
      const vol = createVoxelVolume(4, 4, 4);
      setCellMaterial(vol, 1, 1, 1, 4);
      setCellMaterial(vol, 1, 2, 1, 4); // Occupy cell above
      const faces = collectFaces(
        vol,
        (x, y, z) => getCellMaterialId(vol, x, y, z),
        (x, y, z) => isCellOccupied(vol, x, y, z)
      );

      const topFaces = faces.filter(
        f => f.x === 1 && f.y === 1 && f.z === 1 && f.faceType === 'top'
      );
      expect(topFaces).toHaveLength(0);
    });
  });

  describe('ambient occlusion', () => {
    it('every face has an ao property in [0, 1]', () => {
      const vol = createVoxelVolume(4, 4, 4);
      setCellMaterial(vol, 1, 1, 1, 2);
      const faces = collectFaces(
        vol,
        (x, y, z) => getCellMaterialId(vol, x, y, z),
        (x, y, z) => isCellOccupied(vol, x, y, z)
      );
      for (const face of faces) {
        expect(typeof face.ao).toBe('number');
        expect(face.ao).toBeGreaterThanOrEqual(0);
        expect(face.ao).toBeLessThanOrEqual(1);
      }
    });

    it('isolated cell has ao=0 on all faces (no occluding neighbors)', () => {
      const vol = createVoxelVolume(4, 4, 4);
      setCellMaterial(vol, 1, 1, 1, 2);
      const faces = collectFaces(
        vol,
        (x, y, z) => getCellMaterialId(vol, x, y, z),
        (x, y, z) => isCellOccupied(vol, x, y, z)
      );
      for (const face of faces) {
        expect(face.ao).toBe(0);
      }
    });

    it('top face ao increases when upper diagonal neighbors are occupied', () => {
      const vol = createVoxelVolume(4, 4, 4);
      setCellMaterial(vol, 1, 1, 1, 2);
      setCellMaterial(vol, 0, 2, 1, 2); // upper diagonal: x-1, y+1, z
      const faces = collectFaces(
        vol,
        (x, y, z) => getCellMaterialId(vol, x, y, z),
        (x, y, z) => isCellOccupied(vol, x, y, z)
      );
      const topFace = faces.find(f => f.x === 1 && f.y === 1 && f.z === 1 && f.faceType === 'top');
      expect(topFace).toBeDefined();
      expect(topFace.ao).toBeGreaterThan(0);
    });

    it('left face ao increases when z+1 diagonal neighbors are occupied', () => {
      const vol = createVoxelVolume(4, 4, 4);
      setCellMaterial(vol, 1, 1, 1, 2);
      setCellMaterial(vol, 2, 1, 2, 2); // x+1, y, z+1 — left face diagonal
      const faces = collectFaces(
        vol,
        (x, y, z) => getCellMaterialId(vol, x, y, z),
        (x, y, z) => isCellOccupied(vol, x, y, z)
      );
      const leftFace = faces.find(f => f.x === 1 && f.y === 1 && f.z === 1 && f.faceType === 'left');
      expect(leftFace).toBeDefined();
      expect(leftFace.ao).toBeGreaterThan(0);
    });
  });

  describe('renderBounds', () => {
    it('returns zero bounds for empty array', () => {
      const bounds = renderBounds([]);
      expect(bounds).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
    });

    it('returns single point bounds for one face at origin', () => {
      const face = makeFace(0, 0, 0, 'top', 1);
      const bounds = renderBounds([face]);
      expect(bounds).toEqual({ minX: 0, maxX: 0, minY: 0, maxY: 0 });
    });

    it('computes bounding box for multiple faces', () => {
      const face1 = makeFace(0, 0, 0, 'top', 1); // sx=0, sy=0
      const face2 = makeFace(1, 0, 0, 'top', 1); // sx=16, sy=8
      const face3 = makeFace(0, 0, 1, 'top', 1); // sx=-16, sy=8

      const bounds = renderBounds([face1, face2, face3]);
      expect(bounds.minX).toBe(-16);
      expect(bounds.maxX).toBe(16);
      expect(bounds.minY).toBe(0);
      expect(bounds.maxY).toBe(8);
    });
  });
});
