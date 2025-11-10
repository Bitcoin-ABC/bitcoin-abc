#!/usr/bin/env python3

import io
import json
import os
import re
import time
from collections import UserDict
from pprint import pprint
from urllib.parse import parse_qs, urlencode, urlsplit, urlunsplit
from zipfile import ZipFile

import requests


class TeamcityRequestException(Exception):
    pass


class BuildInfo(UserDict):
    @staticmethod
    def fromSingleBuildResponse(json_content):
        return BuildInfo(json_content["build"][0])

    def getCommits(self):
        return (
            [change["version"] for change in self.data["changes"]["change"]]
            if "changes" in (self.data or {})
            else None
        )

    def getProperties(self):
        propsList = []
        if "properties" in (self.data or {}):
            propsList = self.data["properties"]["property"]

        # Transform list of properties [{'name': name, 'value': value}, ...] into a
        # dict {name: value, ...} since we only care about the property values.
        properties = {}
        for prop in propsList:
            properties[prop["name"]] = prop["value"]

        return properties if properties else None


class TeamCity:
    def __init__(self, base_url, username, password):
        self.session = requests.Session()
        self.base_url = base_url
        self.auth = (username, password)
        self.logger = None
        self.mockTime = None
        with open(
            os.path.join(os.path.dirname(__file__), "ignore-logs.txt"), "rb"
        ) as ignoreList:
            self.ignoreList = ignoreList.readlines()

    def set_logger(self, logger):
        self.logger = logger

    def getTime(self):
        if self.mockTime:
            return self.mockTime
        # time.time() returns a float, so we cast to an int to make it play nice with our other APIs.
        # We do not care about sub-second precision anyway.
        return int(time.time())

    def getIgnoreList(self):
        return self.ignoreList

    def setMockTime(self, mockTime):
        self.mockTime = mockTime

    def getResponse(self, request, expectJson=True):
        response = self.session.send(request.prepare())

        if response.status_code != requests.codes.ok:
            # Log the entire response, because something went wrong
            if self.logger:
                self.logger.info(
                    f"Request:\n{pprint(vars(request))}\n\nResponse:\n{pprint(vars(response))}"
                )
            raise TeamcityRequestException(
                f"Unexpected Teamcity API error! Status code: {response.status_code}"
            )

        content = response.content
        if expectJson:
            content = json.loads(content)

            # Log the response content to aid in debugging
            if self.logger:
                self.logger.info(content)

        return content

    def trigger_build(self, buildTypeId, ref, PHID=None, properties=None):
        endpoint = self.build_url("app/rest/buildQueue")

        if not properties:
            properties = []

        if PHID is not None:
            properties.append(
                {
                    "name": "env.harborMasterTargetPHID",
                    "value": PHID,
                }
            )

        build = {
            "branchName": ref,
            "buildType": {"id": buildTypeId},
            "properties": {
                "property": properties,
            },
        }
        req = self._request("POST", endpoint, json.dumps(build))
        return self.getResponse(req)

    def get_artifact(self, buildId, path):
        endpoint = self.build_url(
            f"app/rest/builds/id:{buildId}/artifacts/content/{path}"
        )

        req = self._request("GET", endpoint)
        content = self.getResponse(req, expectJson=False)

        if not content:
            return None

        return content.decode("utf-8")

    def get_coverage_summary(self, buildId):
        return self.get_artifact(buildId, "coverage.tar.gz!/coverage-summary.txt")

    def get_clean_build_log(self, buildId):
        return self.get_artifact(buildId, "artifacts.tar.gz!/build.clean.log")

    def getBuildLog(self, buildId):
        # Try to get the clean build log first, then fallback to the full log
        try:
            clean_log = self.get_clean_build_log(buildId)
            if clean_log:
                return clean_log
        except TeamcityRequestException:
            # This is likely a 404 and the log doesn't exist. Either way,
            # ignore the failure since there is an alternative log we can
            # fetch.
            pass

        endpoint = self.build_url(
            "downloadBuildLog.html",
            {
                "buildId": buildId,
                "archived": "true",
            },
        )
        req = self._request("GET", endpoint)
        content = self.getResponse(req, expectJson=False)
        ret = ""
        if not content:
            ret = "[Error Fetching Build Log]"
        else:
            z = ZipFile(io.BytesIO(content))
            for filename in z.namelist():
                for line in z.open(filename).readlines():
                    ret += line.decode("utf-8")
        return ret.replace("\r\n", "\n")

    def getPreviewUrl(self, buildId):
        try:
            return self.get_artifact(buildId, "artifacts.tar.gz!/preview_url.log")
        except TeamcityRequestException:
            # This is likely a 404 and the log doesn't exist.
            pass
        return None

    def getBuildProblems(self, buildId):
        endpoint = self.build_url(
            "app/rest/problemOccurrences",
            {
                "locator": f"build:(id:{buildId})",
                "fields": "problemOccurrence(id,details)",
            },
        )
        req = self._request("GET", endpoint)
        content = self.getResponse(req)
        if "problemOccurrence" in (content or {}):
            buildFailures = content["problemOccurrence"]
            for failure in buildFailures:
                # Note: Unlike test failures, build "problems" do not have
                # a well-defined focus line in the build log. For now, we
                # link to the footer to automatically scroll to the bottom
                # of the log where failures tend to be.
                failure["logUrl"] = self.build_url(
                    "viewLog.html",
                    {
                        "tab": "buildLog",
                        "logTab": "tree",
                        "filter": "debug",
                        "expand": "all",
                        "buildId": buildId,
                    },
                    "footer",
                )
            return buildFailures
        return []

    def getFailedTests(self, buildId):
        endpoint = self.build_url(
            "app/rest/testOccurrences",
            {
                "locator": f"build:(id:{buildId}),status:FAILURE",
                "fields": "testOccurrence(id,details,name)",
            },
        )
        req = self._request("GET", endpoint)
        content = self.getResponse(req)
        if "testOccurrence" in (content or {}):
            testFailures = content["testOccurrence"]
            for failure in testFailures:
                params = {
                    "tab": "buildLog",
                    "logTab": "tree",
                    "filter": "debug",
                    "expand": "all",
                    "buildId": buildId,
                }

                match = re.search(r"id:(\d+)", failure["id"])
                if match:
                    params["_focus"] = match.group(1)

                failure["logUrl"] = self.build_url("viewLog.html", params)

            return testFailures

        return []

    def getBuildChangeDetails(self, changeId):
        endpoint = self.build_url(f"app/rest/changes/{changeId}")
        req = self._request("GET", endpoint)
        return self.getResponse(req) or {}

    def getBuildChanges(self, buildId):
        endpoint = self.build_url(
            "app/rest/changes",
            {"locator": f"build:(id:{buildId})", "fields": "change(id)"},
        )
        req = self._request("GET", endpoint)
        content = self.getResponse(req)
        if "change" in (content or {}):
            changes = content["change"]
            for i, change in enumerate(changes):
                changes[i] = self.getBuildChangeDetails(change["id"])
            return changes
        return []

    def getBuildInfo(self, buildId):
        endpoint = self.build_url(
            "app/rest/builds",
            {
                "locator": f"id:{buildId}",
                # Note: Wildcard does not match recursively, so if you need data
                # from a sub-field, be sure to include it in the list.
                "fields": "build(*,changes(*),properties(*),triggered(*))",
            },
        )
        req = self._request("GET", endpoint)
        content = self.getResponse(req)
        if "build" in (content or {}):
            return BuildInfo.fromSingleBuildResponse(content)

        return BuildInfo()

    def checkBuildIsAutomated(self, buildInfo):
        trigger = buildInfo["triggered"]

        # Ignore builds by non-bot users, as these builds may be triggered for
        # any reason with various unknown configs
        return trigger["type"] != "user" or trigger["user"]["username"] == self.auth[0]

    def checkBuildIsScheduled(self, buildInfo):
        trigger = buildInfo["triggered"]
        return trigger["type"] == "schedule"

    # For all nested build configurations under a project, fetch the latest
    # build failures.
    def getLatestBuildAndTestFailures(self, projectId):
        buildEndpoint = self.build_url(
            "app/rest/problemOccurrences",
            {
                "locator": f"currentlyFailing:true,affectedProject:(id:{projectId})",
                "fields": "problemOccurrence(*)",
            },
        )
        buildReq = self._request("GET", buildEndpoint)
        buildContent = self.getResponse(buildReq)

        buildFailures = []
        if "problemOccurrence" in (buildContent or {}):
            buildFailures = buildContent["problemOccurrence"]

        testEndpoint = self.build_url(
            "app/rest/testOccurrences",
            {
                "locator": f"currentlyFailing:true,affectedProject:(id:{projectId})",
                "fields": "testOccurrence(*)",
            },
        )
        testReq = self._request("GET", testEndpoint)
        testContent = self.getResponse(testReq)

        testFailures = []
        if "testOccurrence" in (testContent or {}):
            testFailures = testContent["testOccurrence"]

        return (buildFailures, testFailures)

    def getLatestCompletedBuild(self, buildType, build_fields=None):
        if not build_fields:
            build_fields = ["id"]

        endpoint = self.build_url(
            "app/rest/builds",
            {
                "locator": f"buildType:{buildType}",
                "fields": f"build({','.join(build_fields)})",
                "count": 1,
            },
        )
        req = self._request("GET", endpoint)
        content = self.getResponse(req)

        builds = content.get("build", [])

        # There might be no build completed yet, in this case return None
        if not builds:
            return None

        # But there should be no more than a single build
        if len(builds) > 1:
            raise AssertionError(
                f"Unexpected Teamcity result. Called:\n{endpoint}\nGot:\n{content}"
            )

        return builds[0]

    def formatTime(self, seconds):
        return time.strftime("%Y%m%dT%H%M%S%z", time.gmtime(seconds))

    # The returned count is the number of groups of back-to-back failures, not
    # the number of individual failures
    def getNumAggregateFailuresSince(self, buildType, since):
        sinceTime = self.getTime() - since
        endpoint = self.build_url(
            "app/rest/builds",
            {
                "locator": (
                    f"buildType:{buildType},sinceDate:{self.formatTime(sinceTime)}"
                ),
                "fields": "build",
            },
        )
        req = self._request("GET", endpoint)
        content = self.getResponse(req)
        if "build" in (content or {}):
            builds = [{"status": "SUCCESS"}] + content["build"]
            return sum(
                [
                    (builds[i - 1]["status"], builds[i]["status"])
                    == ("SUCCESS", "FAILURE")
                    for i in range(1, len(builds))
                ]
            )
        return 0

    # For each of the given build name from the configuration file, associate the
    # teamcity build type id and teamcity build name
    def associate_configuration_names(self, project_id, config_names):
        # Get all the build configurations related to the given project, and
        # heavily filter the output to only return the id, name, project info
        # and the property name matching the configuration file.
        endpoint = self.build_url(
            "app/rest/buildTypes",
            {
                "locator": f"affectedProject:{project_id}",
                "fields": "buildType(project(id,name),id,name,parameters($locator(name:env.ABC_BUILD_NAME),property))",
            },
        )
        req = self._request("GET", endpoint)
        content = self.getResponse(req)

        # Example of output:
        # "buildType": [
        #    {
        #      "id": "BitcoinABC_Master_Build1",
        #      "name": "My build 1",
        #      "project": {
        #          "id": "BitcoinABC_Master",
        #          "name": "Master"
        #      },
        #      "parameters": {
        #        "property": [
        #          {
        #            "name": "env.ABC_BUILD_NAME",
        #            "value": "build-1"
        #          }
        #        ]
        #      }
        #    },
        #    {
        #      "id": "BitcoinABC_Master_Build2",
        #      "name": "My build 2",
        #      "project": {
        #          "id": "BitcoinABC_Master",
        #          "name": "Master"
        #      },
        #      "parameters": {
        #        "property": [
        #          {
        #            "name": "env.ABC_BUILD_NAME",
        #            "value": "build-2"
        #          }
        #        ]
        #      }
        #    }
        #  ]

        associated_config = {}
        for build_type in content.get("buildType", {}):
            if "parameters" not in build_type:
                continue

            properties = build_type["parameters"].get("property", [])
            for build_property in properties:
                # Because of our filter, the only possible property is the one we
                # are after. Looking at the value is enough.
                config_name = build_property.get("value", None)
                if config_name in config_names:
                    associated_config.update(
                        {
                            config_name: {
                                "teamcity_build_type_id": build_type["id"],
                                "teamcity_build_name": build_type["name"],
                                "teamcity_project_id": build_type["project"]["id"],
                                "teamcity_project_name": build_type["project"]["name"],
                            }
                        }
                    )

        return associated_config

    def build_url(self, path="", params=None, fragment=None):
        if params is None:
            params = {}

        # Make guest access the default when not calling the rest API.
        # The caller can explicitly set guest=0 to bypass this behavior.
        if "guest" not in params and not path.startswith("app/rest/"):
            params["guest"] = 1

        scheme, netloc = urlsplit(self.base_url)[0:2]
        return urlunsplit(
            (scheme, netloc, path, urlencode(params, doseq=True), fragment)
        )

    def convert_to_guest_url(self, url):
        parsed_url = urlsplit(url)

        # Don't touch unrelated URLs.
        parsed_base_url = urlsplit(self.base_url)
        if (
            parsed_base_url.scheme != parsed_url.scheme
            or parsed_base_url.netloc != parsed_url.netloc
        ):
            return url

        return self.build_url(
            parsed_url.path, parse_qs(parsed_url.query), parsed_url.fragment
        )

    def _request(self, verb, url, data=None, headers=None):
        if self.logger:
            self.logger.info(f"{verb}: {url}")

        if headers is None:
            headers = {"Accept": "application/json", "Content-Type": "application/json"}
        req = requests.Request(verb, url, auth=self.auth, headers=headers)
        req.data = data

        return req
