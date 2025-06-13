pipeline {
  tools {
    jdk 'Java17'
  }
  agent {
    node { label 'docker-host' }
  }

  environment {
        GIT_NAME = "volto-arcgis-block"
        NAMESPACE = "@eeacms"
        SONARQUBE_TAGS = "volto.eea.europa.eu,clms.land.copernicus.eu,water.europa.eu-freshwater,clmsdemo.devel6cph.eea.europa.eu,land.copernicus.eu,ask.copernicus.eu"
        DEPENDENCIES = ""
        BACKEND_PROFILES = "eea.kitkat:testing"
        BACKEND_ADDONS = "clms.addon,clms.types,clms.downloadtool,clms.statstool"
        VOLTO = "16.31.1"
        IMAGE_NAME = BUILD_TAG.toLowerCase()
        NODEJS_VERSION = "16"
    }

  stages {

    stage('Release') {
      when {
        allOf {
          environment name: 'CHANGE_ID', value: ''
          branch 'master'
        }
      }
      steps {
        node(label: 'docker') {
          withCredentials([string(credentialsId: 'eea-jenkins-token', variable: 'GITHUB_TOKEN'),string(credentialsId: 'eea-jenkins-npm-token', variable: 'NPM_TOKEN')]) {
            sh '''docker run -i --rm --pull always --name="$IMAGE_NAME-gitflow-master" -e GIT_BRANCH="$BRANCH_NAME" -e GIT_NAME="$GIT_NAME" -e GIT_TOKEN="$GITHUB_TOKEN" -e NPM_TOKEN="$NPM_TOKEN" -e NODEJS_VERSION="$NODEJS_VERSION" -e LANGUAGE=javascript eeacms/gitflow'''
          }
        }
      }
    }

    stage('Check if testing needed') {
      when {
        allOf {
          not { branch 'master' }
          not { branch 'develop' }
          environment name: 'CHANGE_ID', value: ''
        }
      }
      steps {
        script {
            withCredentials([string(credentialsId: 'eea-jenkins-token', variable: 'GITHUB_TOKEN')]) {
              check_result = sh script: '''docker run --pull always -i --rm --name="$IMAGE_NAME-gitflow-check" -e GIT_TOKEN="$GITHUB_TOKEN" -e GIT_BRANCH="$BRANCH_NAME" -e GIT_ORG="$GIT_ORG" -e GIT_NAME="$GIT_NAME" eeacms/gitflow /check_if_testing_needed.sh''', returnStatus: true

              if (check_result == 0) {
                env.SKIP_TESTS = 'yes'
              }
            }
        }
      }
    }

    stage('Testing') {
      when {
        anyOf {
          allOf {
            not { environment name: 'CHANGE_ID', value: '' }
            environment name: 'CHANGE_TARGET', value: 'develop'
            environment name: 'SKIP_TESTS', value: ''
          }
          allOf {
            environment name: 'CHANGE_ID', value: ''
            anyOf {
              not { changelog '.*^Automated release [0-9\\.]+$' }
              branch 'master'
            }
            environment name: 'SKIP_TESTS', value: ''
          }
        }
      }
      stages {
        stage('Build test image') {
          steps {
            checkout scm
            sh '''docker build --pull --build-arg="VOLTO_VERSION=$VOLTO" --build-arg="ADDON_NAME=$NAMESPACE/$GIT_NAME"  --build-arg="ADDON_PATH=$GIT_NAME" . -t $IMAGE_NAME-frontend'''
          }
        }

        stage('Fix code') {
          when {
              environment name: 'CHANGE_ID', value: ''
              not { branch 'master' }
          }
          steps {
            script {
              fix_result = sh(script: '''docker run --name="$IMAGE_NAME-fix" --entrypoint=make --workdir=/app/src/addons/$GIT_NAME  $IMAGE_NAME-frontend ci-fix''', returnStatus: true)
              sh '''docker cp $IMAGE_NAME-fix:/app/src/addons/$GIT_NAME/src .'''
              sh '''docker rm -v $IMAGE_NAME-fix'''
              FOUND_FIX = sh(script: '''git diff | wc -l''', returnStdout: true).trim()

              if (FOUND_FIX != '0') {
                withCredentials([string(credentialsId: 'eea-jenkins-token', variable: 'GITHUB_TOKEN')]) {
                  sh '''sed -i "s|url = .*|url = https://eea-jenkins:$GITHUB_TOKEN@github.com/eea/$GIT_NAME.git|" .git/config'''
                }
                sh '''git fetch origin $GIT_BRANCH:$GIT_BRANCH'''
                sh '''git checkout $GIT_BRANCH'''
                sh '''git add src/'''
                sh '''git commit -m "style: Automated code fix" '''
                sh '''git push --set-upstream origin $GIT_BRANCH'''
                sh '''exit 1'''
              }
            }
          }
        }

        stage('ES lint') {
          steps {
            sh '''docker run --rm --name="$IMAGE_NAME-eslint" --entrypoint=make --workdir=/app/src/addons/$GIT_NAME $IMAGE_NAME-frontend lint'''
          }
        }

        stage('Style lint') {
          steps {
            sh '''docker run --rm --name="$IMAGE_NAME-stylelint" --entrypoint=make --workdir=/app/src/addons/$GIT_NAME  $IMAGE_NAME-frontend stylelint'''
          }
        }

        stage('Prettier') {
          steps {
            sh '''docker run --rm --name="$IMAGE_NAME-prettier" --entrypoint=make --workdir=/app/src/addons/$GIT_NAME  $IMAGE_NAME-frontend prettier'''
          }
        }

        stage('Coverage Tests') {
          parallel {

            stage('Unit tests') {
              steps {
                script {
                  try {
                    sh '''docker run --name="$IMAGE_NAME-volto" --entrypoint=make --workdir=/app/src/addons/$GIT_NAME $IMAGE_NAME-frontend test-ci'''
                    sh '''rm -rf xunit-reports'''
                    sh '''mkdir -p xunit-reports'''
                    sh '''docker cp $IMAGE_NAME-volto:/app/coverage xunit-reports/'''
                    sh '''docker cp $IMAGE_NAME-volto:/app/junit.xml xunit-reports/'''
                    publishHTML(target : [
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'xunit-reports/coverage/lcov-report',
                    reportFiles: 'index.html',
                    reportName: 'UTCoverage',
                    reportTitles: 'Unit Tests Code Coverage'
                  ])
                } finally {
                    catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                        junit testResults: 'xunit-reports/junit.xml', allowEmptyResults: true
                    }
                    sh script: '''docker rm -v $IMAGE_NAME-volto''', returnStatus: true
                  }
                }
              }
            }
          }
        }
      }
      post {
        always {
            sh script: "docker rmi $IMAGE_NAME-frontend", returnStatus: true
        }
      }
    }

    stage('Code') {
      when {
        allOf {
          environment name: 'CHANGE_ID', value: ''
          not { changelog '.*^Automated release [0-9\\.]+$' }
          not { branch 'master' }
          environment name: 'SKIP_TESTS', value: ''
        }
      }
      steps {
        parallel(

          "ES lint": {
            node(label: 'docker') {
              sh '''docker pull plone/volto-addon-ci:latest'''
              sh '''docker run -i --rm --name="$BUILD_TAG-eslint" -e VOLTO="$VOLTO" -e NAMESPACE="$NAMESPACE" -e GIT_NAME=$GIT_NAME -e GIT_BRANCH="$BRANCH_NAME" -e GIT_CHANGE_ID="$CHANGE_ID" -e NODEJS_VERSION="$NODEJS_VERSION" -e VOLTO=$VOLTO plone/volto-addon-ci:latest eslint'''
            }
          },

          "Style lint": {
            node(label: 'docker') {
              sh '''docker pull plone/volto-addon-ci:latest'''
              sh '''docker run -i --rm --name="$BUILD_TAG-stylelint" -e VOLTO="$VOLTO" -e NAMESPACE="$NAMESPACE" -e GIT_NAME=$GIT_NAME -e GIT_BRANCH="$BRANCH_NAME" -e GIT_CHANGE_ID="$CHANGE_ID" -e NODEJS_VERSION="$NODEJS_VERSION" -e VOLTO=$VOLTO plone/volto-addon-ci:latest stylelint'''
            }
          },

          "Prettier": {
            node(label: 'docker') {
              sh '''docker pull plone/volto-addon-ci:latest'''
              sh '''docker run -i --rm --name="$BUILD_TAG-prettier" -e VOLTO="$VOLTO" -e NAMESPACE="$NAMESPACE" -e GIT_NAME=$GIT_NAME -e GIT_BRANCH="$BRANCH_NAME" -e GIT_CHANGE_ID="$CHANGE_ID" -e NODEJS_VERSION="$NODEJS_VERSION" -e VOLTO=$VOLTO plone/volto-addon-ci:latest prettier'''
            }
          }
        )
      }
    }

    stage('Tests') {
      when {
        anyOf {
          allOf {
            not { environment name: 'CHANGE_ID', value: '' }
            environment name: 'CHANGE_TARGET', value: 'develop'
            environment name: 'SKIP_TESTS', value: ''
          }
          allOf {
            environment name: 'CHANGE_ID', value: ''
            anyOf {
              not { changelog '.*^Automated release [0-9\\.]+$' }
              branch 'master'
            }
            environment name: 'SKIP_TESTS', value: ''
          }
        }
      }
      steps {
        parallel(

          "Volto": {
            node(label: 'docker') {
              script {
                try {
                  sh '''docker pull plone/volto-addon-ci:latest'''
                  sh '''docker run -i --name="$BUILD_TAG-volto" -e NAMESPACE="$NAMESPACE" -e VOLTO=$VOLTO -e GIT_NAME=$GIT_NAME -e GIT_BRANCH="$BRANCH_NAME" -e GIT_CHANGE_ID="$CHANGE_ID" -e NODEJS_VERSION="$NODEJS_VERSION" -e VOLTO=$VOLTO plone/volto-addon-ci:latest'''
                  sh '''rm -rf xunit-reports'''
                  sh '''mkdir -p xunit-reports'''
                  sh '''docker cp $BUILD_TAG-volto:/opt/frontend/my-volto-project/coverage xunit-reports/'''
                  sh '''docker cp $BUILD_TAG-volto:/opt/frontend/my-volto-project/junit.xml xunit-reports/'''
                  sh '''docker cp $BUILD_TAG-volto:/opt/frontend/my-volto-project/unit_tests_log.txt xunit-reports/'''
                  stash name: "xunit-reports", includes: "xunit-reports/**"
                  archiveArtifacts artifacts: "xunit-reports/unit_tests_log.txt", fingerprint: true
                  publishHTML (target : [
                    allowMissing: false,
                    alwaysLinkToLastBuild: true,
                    keepAll: true,
                    reportDir: 'xunit-reports/coverage/lcov-report',
                    reportFiles: 'index.html',
                    reportName: 'UTCoverage',
                    reportTitles: 'Unit Tests Code Coverage'
                  ])
                } finally {
                    catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
                        junit testResults: 'xunit-reports/junit.xml', allowEmptyResults: true
                    }
                   sh script: '''docker rm -v $BUILD_TAG-volto''', returnStatus: true
                }
              }
            }
          }
        )
      }
    }

    // stage('Integration tests') {
    //   when {
    //     anyOf {
    //       allOf {
    //         not { environment name: 'CHANGE_ID', value: '' }
    //         environment name: 'CHANGE_TARGET', value: 'develop'
    //       }
    //       allOf {
    //         environment name: 'CHANGE_ID', value: ''
    //         anyOf {
    //           not { changelog '.*^Automated release [0-9\\.]+$' }
    //           branch 'master'
    //         }
    //       }
    //     }
    //   }
    //   steps {
    //     parallel(

    //       "Cypress": {
    //         node(label: 'docker') {
    //           script {
    //             try {
    //               sh '''docker pull plone; docker run -d --rm --name="$BUILD_TAG-plone" -e SITE="Plone" -e PROFILES="profile-plone.restapi:blocks" plone fg'''
    //               sh '''docker pull plone/volto-addon-ci:15.x; docker run -i --name="$BUILD_TAG-cypress" --link $BUILD_TAG-plone:plone -e VOLTO=$VOLTO -e NAMESPACE="$NAMESPACE" -e GIT_NAME=$GIT_NAME -e GIT_BRANCH="$BRANCH_NAME" -e GIT_CHANGE_ID="$CHANGE_ID" -e DEPENDENCIES="$DEPENDENCIES" -e NODE_ENV=test plone/volto-addon-ci:15.x cypress'''
    //             } finally {
    //               try {
    //                 sh '''rm -rf cypress-reports cypress-results cypress-coverage'''
    //                 sh '''mkdir -p cypress-reports cypress-results cypress-coverage'''
    //                 sh '''docker cp $BUILD_TAG-cypress:/opt/frontend/my-volto-project/src/addons/$GIT_NAME/cypress/videos cypress-reports/'''
    //                 sh '''docker cp $BUILD_TAG-cypress:/opt/frontend/my-volto-project/src/addons/$GIT_NAME/cypress/reports cypress-results/'''
    //                 coverage = sh script: '''docker cp $BUILD_TAG-cypress:/opt/frontend/my-volto-project/src/addons/$GIT_NAME/coverage cypress-coverage/''', returnStatus: true
    //                 if ( coverage == 0 ) {
    //                      publishHTML (target : [allowMissing: false,
    //                          alwaysLinkToLastBuild: true,
    //                          keepAll: true,
    //                          reportDir: 'cypress-coverage/coverage/lcov-report',
    //                          reportFiles: 'index.html',
    //                          reportName: 'CypressCoverage',
    //                          reportTitles: 'Integration Tests Code Coverage'])
    //                 }
    //                 sh '''touch empty_file; for ok_test in $(grep -E 'file=.*failures="0"' $(grep 'testsuites .*failures="0"' $(find cypress-results -name *.xml) empty_file | awk -F: '{print $1}') empty_file | sed 's/.* file="\\(.*\\)" time.*/\\1/' | sed 's#^cypress/integration/##g' | sed 's#^../../../node_modules/@eeacms/##g'); do rm -f cypress-reports/videos/$ok_test.mp4; rm -f cypress-reports/$ok_test.mp4; done'''
    //                 archiveArtifacts artifacts: 'cypress-reports/**/*.mp4', fingerprint: true, allowEmptyArchive: true
    //                 stash name: "cypress-coverage", includes: "cypress-coverage/**", allowEmpty: true
    //               }
    //               finally {
    //                 catchError(buildResult: 'SUCCESS', stageResult: 'SUCCESS') {
    //                     junit testResults: 'cypress-results/**/*.xml', allowEmptyResults: true
    //                 }
    //                 sh script: "docker stop $BUILD_TAG-plone", returnStatus: true
    //                 sh script: "docker rm -v $BUILD_TAG-plone", returnStatus: true
    //                 sh script: "docker rm -v $BUILD_TAG-cypress", returnStatus: true

    //               }
    //             }
    //           }
    //         }
    //       }

    //     )
    //   }
    // }

    // stage('Report to SonarQube') {
    //   when {
    //     anyOf {
    //       allOf {
    //         not { environment name: 'CHANGE_ID', value: '' }
    //         environment name: 'CHANGE_TARGET', value: 'develop'
    //       }
    //       allOf {
    //         environment name: 'CHANGE_ID', value: ''
    //         anyOf {
    //           allOf {
    //             branch 'develop'
    //             not { changelog '.*^Automated release [0-9\\.]+$' }
    //           }
    //           branch 'master'
    //         }
    //       }
    //     }
    //   }
    //   steps {
    //     node(label: 'swarm') {
    //       script{
    //         checkout scm
    //         unstash "xunit-reports"
    //         unstash "cypress-coverage"
    //         def scannerHome = tool 'SonarQubeScanner';
    //         def nodeJS = tool 'NodeJS';
    //         withSonarQubeEnv('Sonarqube') {
    //           sh '''sed -i "s#/opt/frontend/my-volto-project/src/addons/${GIT_NAME}/##g" xunit-reports/coverage/lcov.info'''
    //           sh "export PATH=${scannerHome}/bin:${nodeJS}/bin:$PATH; sonar-scanner -Dsonar.javascript.lcov.reportPaths=./xunit-reports/coverage/lcov.info,./cypress-coverage/coverage/lcov.info -Dsonar.sources=./src -Dsonar.projectKey=$GIT_NAME-$BRANCH_NAME -Dsonar.projectVersion=$BRANCH_NAME-$BUILD_NUMBER"
    //           sh '''try=2; while [ \$try -gt 0 ]; do curl -s -XPOST -u "${SONAR_AUTH_TOKEN}:" "${SONAR_HOST_URL}api/project_tags/set?project=${GIT_NAME}-${BRANCH_NAME}&tags=${SONARQUBE_TAGS},${BRANCH_NAME}" > set_tags_result; if [ \$(grep -ic error set_tags_result ) -eq 0 ]; then try=0; else cat set_tags_result; echo "... Will retry"; sleep 60; try=\$(( \$try - 1 )); fi; done'''
    //         }
    //       }
    //     }
    //   }
    // }
/*
    stage('SonarQube compare to master') {
      when {
        anyOf {
          allOf {
            not { environment name: 'CHANGE_ID', value: '' }
            environment name: 'CHANGE_TARGET', value: 'develop'
          }
          allOf {
            environment name: 'CHANGE_ID', value: ''
            branch 'develop'
            not { changelog '.*^Automated release [0-9\\.]+$' }
          }
        }
      }
      steps {
        node(label: 'docker') {
          script {
            sh '''docker pull eeacms/gitflow'''
            sh '''echo "Error" > checkresult.txt'''
            catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
               sh '''set -o pipefail; docker run -i --rm --name="$BUILD_TAG-gitflow-sn" -e GIT_BRANCH="$BRANCH_NAME" -e GIT_NAME="$GIT_NAME" eeacms/gitflow /checkSonarqubemaster.sh | grep -v "Found script" | tee checkresult.txt'''
             }

            publishChecks name: 'SonarQube', title: 'Sonarqube Code Quality Check', summary: "Quality check on the SonarQube metrics from branch develop, comparing it with the ones from master branch. No bugs are allowed",
                          text: readFile(file: 'checkresult.txt'), conclusion: "${currentBuild.currentResult}",
                          detailsURL: "${env.BUILD_URL}display/redirect"
          }
        }
      }
    }
*/
    stage('Pull Request') {
      when {
        not {
          environment name: 'CHANGE_ID', value: ''
        }
        environment name: 'CHANGE_TARGET', value: 'master'
      }
      steps {
        node(label: 'docker') {
          script {
            if ( env.CHANGE_BRANCH != "develop" ) {
                error "Pipeline aborted due to PR not made from develop branch"
            }
           withCredentials([string(credentialsId: 'eea-jenkins-token', variable: 'GITHUB_TOKEN')]) {
            sh '''docker run --pull always -i --rm --name="$IMAGE_NAME-gitflow-pr" -e GIT_CHANGE_TARGET="$CHANGE_TARGET" -e GIT_CHANGE_BRANCH="$CHANGE_BRANCH" -e GIT_CHANGE_AUTHOR="$CHANGE_AUTHOR" -e GIT_CHANGE_TITLE="$CHANGE_TITLE" -e GIT_TOKEN="$GITHUB_TOKEN" -e GIT_BRANCH="$BRANCH_NAME" -e GIT_CHANGE_ID="$CHANGE_ID" -e GIT_ORG="$GIT_ORG" -e GIT_NAME="$GIT_NAME" -e LANGUAGE=javascript eeacms/gitflow'''
           }
          }
        }
      }
    }

  }

  post {
    always {
      cleanWs(cleanWhenAborted: true, cleanWhenFailure: true, cleanWhenNotBuilt: true, cleanWhenSuccess: true, cleanWhenUnstable: true, deleteDirs: true)
    }
    changed {
      script {
        def details = """<h1>${env.JOB_NAME} - Build #${env.BUILD_NUMBER} - ${currentBuild.currentResult}</h1>
                         <p>Check console output at <a href="${env.BUILD_URL}/display/redirect">${env.JOB_BASE_NAME} - #${env.BUILD_NUMBER}</a></p>
                      """
        emailext(
        subject: '$DEFAULT_SUBJECT',
        body: details,
        attachLog: true,
        compressLog: true,
        recipientProviders: [[$class: 'DevelopersRecipientProvider'], [$class: 'CulpritsRecipientProvider']]
        )
      }
    }
  }
}
