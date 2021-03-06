<?xml version='1.0' encoding='UTF-8'?>
<project>
  <actions/>
  <description>$description</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <hudson.model.ParametersDefinitionProperty>
      <parameterDefinitions>
        <hudson.model.StringParameterDefinition>
          <name>APP_VERSION</name>
          <description>This is the app version you want to deploy.  Gotten from releases/us/vistacore/artifact-versions-shell</description>
          <defaultValue/>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>RELEASE_VERSION</name>
          <description>This is the version you want displayed in the actual application</description>
          <defaultValue/>
        </hudson.model.StringParameterDefinition>
        <hudson.model.StringParameterDefinition>
          <name>NEXUS_URL</name>
          <description></description>
          <defaultValue>https://store.vistacore.us</defaultValue>
        </hudson.model.StringParameterDefinition>
      </parameterDefinitions>
    </hudson.model.ParametersDefinitionProperty>
  </properties>
  <scm class="hudson.plugins.git.GitSCM" plugin="git@3.1.0">
    <configVersion>2</configVersion>
    <userRemoteConfigs>
      <hudson.plugins.git.UserRemoteConfig>
        <url>$gitUrl</url>
        <credentialsId>git</credentialsId>
      </hudson.plugins.git.UserRemoteConfig>
    </userRemoteConfigs>
    <branches>
      <hudson.plugins.git.BranchSpec>
        <name>$gitBranch</name>
      </hudson.plugins.git.BranchSpec>
    </branches>
    <doGenerateSubmoduleConfigurations>false</doGenerateSubmoduleConfigurations>
    <gitTool>Default</gitTool>
    <submoduleCfg class="list"/>
    <extensions/>
  </scm>
  <assignedNode>rdkdocker</assignedNode>
  <canRoam>false</canRoam>
  <disabled>true</disabled>
  <blockBuildWhenDownstreamBuilding>false</blockBuildWhenDownstreamBuilding>
  <blockBuildWhenUpstreamBuilding>false</blockBuildWhenUpstreamBuilding>
  <triggers/>
  <concurrentBuild>false</concurrentBuild>
  <builders>
    <hudson.tasks.Shell>
      <command> set -e
curl &quot;\$NEXUS_URL/nexus/service/local/repositories/releases/content/us/vistacore/artifact-versions-shell/\$APP_VERSION/artifact-versions-shell-\$APP_VERSION.sh&quot; -o artifact_versions.sh

source ./artifact_versions.sh
if [ -z &quot;\$APP_VERSION&quot; ]; then
  echo &quot;You must set the APP_VERSION variable to run this job.&quot;
  exit 1
fi

# https://github.com/berkshelf/berkshelf-api/issues/112
export LANG=en_US.UTF-8
# increasing the solver&apos;s timeout https://github.com/berkshelf/solve
export SOLVE_TIMEOUT=1920

rm -rf ~/.berkshelf/cookbooks

berksfile_dirs=( provisioner_berksfile_ehmp \\
provisioner_berksfile_rdk \\
provisioner_berksfile_ehmp_ui \\
provisioner_berksfile_cds )

for berksfile_dir in "\${berksfile_dirs[@]}"; do
  cd &quot;\$WORKSPACE/package/\$berksfile_dir&quot; || exit
  rm -f Berksfile.lock
  # 5 retries as a workaround to https://github.com/berkshelf/berkshelf/issues/1573
  n=0
  until [ \$n -ge 5 ]; do
    berks install &amp;&amp; break
    n=\$((n+1))
  done
done

cd &quot;\$WORKSPACE&quot; || exit
sh -ex \$WORKSPACE/package/generate-package.sh
sh -ex \$WORKSPACE/package/upload-release-manifest.sh
</command>
    </hudson.tasks.Shell>
  </builders>
  <publishers>
    <org.jvnet.hudson.plugins.groovypostbuild.GroovyPostbuildRecorder plugin="groovy-postbuild@2.3.1">
      <script plugin="script-security@1.27">
        <script>import hudson.model.*
import hudson.util.*

def actionList = manager.build.getActions(hudson.model.ParametersAction)
def resolver = actionList.get(0).createVariableResolver(manager.build)
def appVersion = resolver.resolve(&apos;APP_VERSION&apos;)
def releaseVersion = resolver.resolve(&apos;RELEASE_VERSION&apos;)

manager.build.setDisplayName(&quot;\${appVersion}-\${releaseVersion}&quot;)</script>
        <sandbox>false</sandbox>
      </script>
      <behavior>0</behavior>
      <runForMatrixParent>false</runForMatrixParent>
    </org.jvnet.hudson.plugins.groovypostbuild.GroovyPostbuildRecorder>
  </publishers>
  <buildWrappers>
    <hudson.plugins.ansicolor.AnsiColorBuildWrapper plugin="ansicolor@0.5.0">
      <colorMapName>xterm</colorMapName>
    </hudson.plugins.ansicolor.AnsiColorBuildWrapper>
    <EnvInjectPasswordWrapper plugin="envinject@1.93.1">
      <injectGlobalPasswords>true</injectGlobalPasswords>
      <maskPasswordParameters>true</maskPasswordParameters>
      <passwordEntries/>
    </EnvInjectPasswordWrapper>
    <org.jenkinsci.plugins.credentialsbinding.impl.SecretBuildWrapper plugin="credentials-binding@1.10">
  <bindings>
    <org.jenkinsci.plugins.credentialsbinding.impl.FileBinding>
      <credentialsId>jenkins</credentialsId>
      <variable>HOST_KEY_PATH</variable>
    </org.jenkinsci.plugins.credentialsbinding.impl.FileBinding>
  </bindings>
</org.jenkinsci.plugins.credentialsbinding.impl.SecretBuildWrapper>
  </buildWrappers>
</project>
