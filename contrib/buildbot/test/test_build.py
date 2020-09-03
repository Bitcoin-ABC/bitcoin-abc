#!/usr/bin/env python3
#
# Copyright (c) 2019 The Bitcoin ABC developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.


from build import BuildStatus, BuildTarget
import unittest


class BuildTests(unittest.TestCase):
    def setUp(self):
        pass

    def tearDown(self):
        pass

    def test_buildTarget(self):
        build_target_phid = "PHID-HMBT-123456"

        # Create a build target
        build_target = BuildTarget(build_target_phid)

        # Queue a few builds
        for i in range(10):
            name = "build-{}".format(i)
            build_target.queue_build(i, name)
            self.assertEqual(len(build_target.builds), i + 1)
            self.assertEqual(build_target.builds[i].status, BuildStatus.Queued)
            self.assertEqual(build_target.status(), BuildStatus.Queued)
            self.assertEqual(build_target.is_finished(), False)

        # Update the status of a single build to running, the build target
        # should be running
        build_target.update_build_status(3, BuildStatus.Running)
        self.assertEqual(build_target.builds[3].status, BuildStatus.Running)
        self.assertEqual(build_target.status(), BuildStatus.Running)
        self.assertEqual(build_target.is_finished(), False)

        # If all the builds are finished with success, the build target is also
        # finished with success. Check it is running until the last one...
        build_ids = list(build_target.builds.keys())
        for build_id in build_ids[:-1]:
            build_target.update_build_status(build_id, BuildStatus.Success)
            self.assertEqual(
                build_target.builds[build_id].status,
                BuildStatus.Success)
            self.assertEqual(build_target.status(), BuildStatus.Running)
            self.assertEqual(build_target.is_finished(), False)

        # ... which will change the state to finished/success.
        build_id = build_ids[-1]
        build_target.update_build_status(build_id, BuildStatus.Success)
        self.assertEqual(
            build_target.builds[build_id].status,
            BuildStatus.Success)
        self.assertEqual(build_target.status(), BuildStatus.Success)
        self.assertEqual(build_target.is_finished(), True)

        # If a single build fails, the build target should fail
        build_target.update_build_status(3, BuildStatus.Failure)
        self.assertEqual(build_target.builds[3].status, BuildStatus.Failure)
        self.assertEqual(build_target.status(), BuildStatus.Failure)
        self.assertEqual(build_target.is_finished(), True)

        # All the builds are finished and successful excepted one which remains
        # queued: the build target should be running and not finished
        build_target.update_build_status(3, BuildStatus.Queued)
        self.assertEqual(build_target.builds[3].status, BuildStatus.Queued)
        self.assertEqual(build_target.status(), BuildStatus.Running)
        self.assertEqual(build_target.is_finished(), False)


if __name__ == '__main__':
    unittest.main()
