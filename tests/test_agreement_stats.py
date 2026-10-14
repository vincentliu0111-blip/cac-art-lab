"""Known cases for the published agreement calculations."""

import importlib.util
import unittest
from pathlib import Path


spec = importlib.util.spec_from_file_location(
    "agreement_stats", Path(__file__).resolve().parents[1] / "tools/agreement_stats.py")
stats = importlib.util.module_from_spec(spec)
spec.loader.exec_module(stats)


class AgreementStatisticsTest(unittest.TestCase):
    def test_cohen_uses_rater_marginals_not_fixed_half(self):
        result = stats.cohen_kappa(list("AABB"), list("AAAB"))
        self.assertEqual(result["agreement"], .75)
        self.assertEqual(result["expected"], .5)
        self.assertEqual(result["kappa"], .5)
        self.assertIsNone(stats.cohen_kappa(list("AA"), list("AA"))["kappa"])

    def test_fleiss_known_extremes(self):
        judges = ["one", "two", "three"]
        unanimous = [{judge: "A" for judge in judges},
                     {judge: "B" for judge in judges}]
        self.assertEqual(stats.fleiss_kappa(unanimous, judges)["kappa"], 1)
        split = [{"one": "A", "two": "A", "three": "B"},
                 {"one": "B", "two": "B", "three": "A"}]
        self.assertAlmostEqual(stats.fleiss_kappa(split, judges)["kappa"], -1 / 3)

    def test_session_bootstrap_preserves_paired_choices(self):
        rows = [("one", "A", "A"), ("one", "B", "B"),
                ("two", "A", "A"), ("two", "B", "B")]
        interval = stats.session_bootstrap(rows, iterations=100, seed=7)
        self.assertEqual((interval["lower"], interval["upper"]), (1, 1))
        self.assertEqual(interval["sessions"], 2)


if __name__ == "__main__":
    unittest.main()
