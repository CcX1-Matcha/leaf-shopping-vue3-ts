// 小兔鲜商城 · CI/CD 流水线
// 流程：拉代码 -> 备份当前镜像 -> 构建镜像 -> 部署 -> 容器内健康检查，失败自动回滚
pipeline {
  agent any

  options {
    disableConcurrentBuilds()
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    IMAGE = 'leaf-shopping-app'
    PROJECT_NAME = 'leaf-shopping'
    APP_CONTAINER = 'leaf-app'
    NPM_REGISTRY = 'https://registry.npmmirror.com'
  }

  stages {
    stage('拉取代码') {
      steps {
        checkout scm
        sh '''
          echo "构建号: $BUILD_NUMBER"
          echo "提交  : $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
          echo "说明  : $(git log -1 --pretty=%s 2>/dev/null || echo -)"
        '''
      }
    }

    stage('备份当前镜像') {
      steps {
        sh 'docker tag $IMAGE:latest $IMAGE:previous 2>/dev/null || echo "首次构建，没有可备份的镜像"'
      }
    }

    stage('构建镜像') {
      steps {
        sh 'docker build -f Dockerfile.build --build-arg NPM_REGISTRY=$NPM_REGISTRY -t $IMAGE:$BUILD_NUMBER -t $IMAGE:latest .'
      }
    }

    stage('部署') {
      steps {
        sh 'docker compose -p $PROJECT_NAME up -d --force-recreate --no-build'
      }
    }

    stage('健康检查') {
      steps {
        sh '''
          # 注意：要在【容器内部】探测。Jenkins 容器里的 127.0.0.1:8080 是它自己，连不到宿主机
          for i in $(seq 1 20); do
            if docker exec $APP_CONTAINER wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1; then
              echo "健康检查通过（第 $i 次尝试）"
              echo "指标接口返回："
              docker exec $APP_CONTAINER wget -qO- http://127.0.0.1:3000/metrics | head -3
              exit 0
            fi
            echo "第 $i 次未就绪，等 3 秒"
            sleep 3
          done
          echo "健康检查失败，应用容器日志："
          docker logs $APP_CONTAINER --tail 30
          exit 1
        '''
      }
    }
  }

  post {
    failure {
      echo '构建或部署失败，尝试回滚到上一个可用镜像'
      sh '''
        if docker image inspect $IMAGE:previous >/dev/null 2>&1; then
          docker tag $IMAGE:previous $IMAGE:latest
          docker compose -p $PROJECT_NAME up -d --force-recreate --no-build
          echo "已回滚到上一个版本"
        else
          echo "没有可回滚的镜像，跳过"
        fi
      '''
    }
    success {
      echo '部署成功，访问 http://<服务器IP>:8080'
    }
  }
}
