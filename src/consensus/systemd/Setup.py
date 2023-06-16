from setuptools import setup, find_packages

with open("README.md") as f:
    readme = f.read()

requires = [
    "cbpro-notbroken==1.1.5",
    "sqlalchemy>=1.2.14",
    "python-dateutil>=2.7.5",
    "requests>=2.21.0",
]
test_requires = ["pytest-cov", "pytest>=3.5.0"]

setup(
    name="optimal_buy_cbpro",
    version="1.1.22",
    description="Buy the coins, optimally!",
    long_description=readme,
    long_description_content_type="text/markdown",
    author="Brenden Matthews",
    author_email="brenden@diddyinc.com",
    url="https://github.com/brndnmtthws/optimal-buy-cbpro",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "optimal-buy-cbpro=optimal_buy_cbpro.optimal_buy_cbpro:main"
        ]
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: Public Domain",
        "Operating System :: OS Independent",
    ],
    python_requires=">=3.5",
    install_requires=requires,
    tests_require=test_requires,
    extras_require={"test": test_requires},
)
