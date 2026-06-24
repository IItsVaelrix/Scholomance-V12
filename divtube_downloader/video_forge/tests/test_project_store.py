import unittest
import tempfile
import os
import json

from video_forge.project_store import ProjectStore
from video_forge.schema import VideoProject, MediaItem


class TestProjectStore(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.store = ProjectStore(base_dir=self.tmpdir)

    def test_save_and_load(self):
        p = VideoProject(project_id="stest1", project_name="Store Test")
        m = MediaItem(media_id="m1", file_path="/v.mp4", file_type="video",
                      duration_secs=60, width=1920, height=1080, fps=30,
                      audio_channels=2, file_hash="abc", label="v.mp4")
        p.media_bin["m1"] = m
        path = self.store.save(p)
        self.assertTrue(os.path.isfile(path))
        p2 = self.store.load("stest1")
        self.assertEqual(p2.project_name, "Store Test")
        self.assertEqual(len(p2.media_bin), 1)

    def test_list_projects(self):
        p1 = VideoProject(project_id="lp1", project_name="List Project 1")
        p2 = VideoProject(project_id="lp2", project_name="List Project 2")
        self.store.save(p1)
        self.store.save(p2)
        projects = self.store.list_projects()
        self.assertEqual(len(projects), 2)
        names = {proj["projectName"] for proj in projects}
        self.assertIn("List Project 1", names)
        self.assertIn("List Project 2", names)

    def test_delete_project(self):
        p = VideoProject(project_id="del1", project_name="Delete Me")
        self.store.save(p)
        self.assertTrue(os.path.isfile(self.store.project_path("del1")))
        self.store.delete("del1")
        self.assertFalse(os.path.isfile(self.store.project_path("del1")))

    def test_load_nonexistent_raises(self):
        with self.assertRaises(FileNotFoundError):
            self.store.load("does_not_exist")

    def test_list_renders_empty(self):
        p = VideoProject(project_id="norender", project_name="No Renders")
        self.store.save(p)
        self.assertEqual(self.store.list_renders("norender"), [])

    def test_save_assigns_id_if_missing(self):
        p = VideoProject(project_name="No ID")
        path = self.store.save(p)
        self.assertTrue(p.project_id is not None and len(p.project_id) > 0)
        self.assertTrue(os.path.isfile(path))

    def test_atomic_write(self):
        p = VideoProject(project_id="atomic1", project_name="Atomic")
        path = self.store.save(p)
        with open(path, "r") as f:
            data = json.load(f)
        self.assertEqual(data["projectName"], "Atomic")


if __name__ == "__main__":
    unittest.main()
