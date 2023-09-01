import ast
import os
import shutil
import sys
import tempfile
import unittest
from io import StringIO

from ..simple_config import SimpleConfig, read_user_config


class TestSimpleConfig(unittest.TestCase):
    def setUp(self):
        super(TestSimpleConfig, self).setUp()
        # make sure "read_user_config" and "user_dir" return a temporary directory.
        self.electrum_dir = tempfile.mkdtemp()
        # Do the same for the user dir to avoid overwriting the real configuration
        # for development machines with electrum installed :)
        self.user_dir = tempfile.mkdtemp()

        self.options = {"data_path": self.electrum_dir}
        self._saved_stdout = sys.stdout
        self._stdout_buffer = StringIO()
        sys.stdout = self._stdout_buffer

    def tearDown(self):
        super(TestSimpleConfig, self).tearDown()
        # Remove the temporary directory after each test (to make sure we don't
        # pollute /tmp for nothing.
        shutil.rmtree(self.electrum_dir)
        shutil.rmtree(self.user_dir)

        # Restore the "real" stdout
        sys.stdout = self._saved_stdout

    def test_simple_config_key_rename(self):
        """auto_cycle was renamed auto_connect"""

        def fake_read_user(_):
            return {"auto_cycle": True}

        def read_user_dir():
            return self.user_dir

        config = SimpleConfig(
            options=self.options,
            read_user_config_function=fake_read_user,
            read_user_dir_function=read_user_dir,
        )
        self.assertEqual(config.get("auto_connect"), True)
        self.assertEqual(config.get("auto_cycle"), None)

        def fake_read_user(_):
            return {"auto_connect": False, "auto_cycle": True}

        config = SimpleConfig(
            options=self.options,
            read_user_config_function=fake_read_user,
            read_user_dir_function=read_user_dir,
        )
        self.assertEqual(config.get("auto_connect"), False)
        self.assertEqual(config.get("auto_cycle"), None)

    def test_simple_config_command_line_overrides_everything(self):
        """Options passed by command line override all other configuration
        sources"""

        def fake_read_user(_):
            return {"data_path": "b"}

        def read_user_dir():
            return self.user_dir

        config = SimpleConfig(
            options=self.options,
            read_user_config_function=fake_read_user,
            read_user_dir_function=read_user_dir,
        )
        self.assertEqual(self.options.get("data_path"), config.get("data_path"))

    def test_simple_config_user_config_is_used_if_others_arent_specified(self):
        """If no system-wide configuration and no command-line options are
        specified, the user configuration is used instead."""

        def fake_read_user(_):
            return {"data_path": self.electrum_dir}

        def read_user_dir():
            return self.user_dir

        config = SimpleConfig(
            options={},
            read_user_config_function=fake_read_user,
            read_user_dir_function=read_user_dir,
        )
        self.assertEqual(self.options.get("data_path"), config.get("data_path"))

    def test_cannot_set_options_passed_by_command_line(self):
        def fake_read_user(_):
            return {"data_path": "b"}

        def read_user_dir():
            return self.user_dir

        config = SimpleConfig(
            options=self.options,
            read_user_config_function=fake_read_user,
            read_user_dir_function=read_user_dir,
        )
        config.set_key("data_path", "c")
        self.assertEqual(self.options.get("data_path"), config.get("data_path"))

    def test_can_set_options_set_in_user_config(self):
        another_path = tempfile.mkdtemp()

        def fake_read_user(_):
            return {"data_path": self.electrum_dir}

        def read_user_dir():
            return self.user_dir

        config = SimpleConfig(
            options={},
            read_user_config_function=fake_read_user,
            read_user_dir_function=read_user_dir,
        )
        config.set_key("data_path", another_path)
        self.assertEqual(another_path, config.get("data_path"))

    def test_user_config_is_not_written_with_read_only_config(self):
        """The user config does not contain command-line options when saved."""

        def fake_read_user(_):
            return {"something": "a"}

        def read_user_dir():
            return self.user_dir

        self.options.update({"something": "c"})
        config = SimpleConfig(
            options=self.options,
            read_user_config_function=fake_read_user,
            read_user_dir_function=read_user_dir,
        )
        config.save_user_config()
        contents = None
        with open(
            os.path.join(self.electrum_dir, "config"), "r", encoding="utf-8"
        ) as f:
            contents = f.read()
        result = ast.literal_eval(contents)
        result.pop("config_version", None)
        self.assertEqual({"something": "a"}, result)


class TestUserConfig(unittest.TestCase):
    def setUp(self):
        super(TestUserConfig, self).setUp()
        self._saved_stdout = sys.stdout
        self._stdout_buffer = StringIO()
        sys.stdout = self._stdout_buffer

        self.user_dir = tempfile.mkdtemp()

    def tearDown(self):
        super(TestUserConfig, self).tearDown()
        shutil.rmtree(self.user_dir)
        sys.stdout = self._saved_stdout

    def test_no_path_means_no_result(self):
        result = read_user_config(None)
        self.assertEqual({}, result)

    def test_path_without_config_file(self):
        """We pass a path but if does not contain a "config" file."""
        result = read_user_config(self.user_dir)
        self.assertEqual({}, result)

    def test_path_with_reprd_object(self):
        class something:
            pass

        thefile = os.path.join(self.user_dir, "config")
        payload = something()
        with open(thefile, "w", encoding="utf-8") as f:
            f.write(repr(payload))

        result = read_user_config(self.user_dir)
        self.assertEqual({}, result)


if __name__ == "__main__":
    unittest.main()
