pragma solidity ^0.4.21;

contract Tensegrity {
    event LessonStarted (
        address indexed teacher,
        uint indexed end_time
    );
    
    event DisputeMade (
        address indexed teacher,
        uint index
    );
    
    event DisputeResolved (
        address indexed teacher,
        address indexed student,
        uint price,
        bool teacher_is_right
    );
    
    event LessonPrepared (
        address indexed teacher
    );
    
    struct Course {
        address student;
        address author;
        bool blocked;
        uint price;
        uint duration;
        uint start;
    }
    
    struct Dispute {
        address student;
        address author;
        uint price;
    }
    
    function is_expired(address teacher) private returns (bool) {
        uint diff = now - courses[teacher].start;
        return diff > courses[teacher].duration;
    }
    
    function is_blocked(address teacher) private returns (bool) {
        return courses[teacher].blocked;
    }
    
    modifier is_moderator() {
        require(msg.sender == moderator, "Only moderators are allowed to inkoe this function");
        _;
    }
    
    modifier is_student(address teacher) {
        require(courses[teacher].student == msg.sender, "You are not student");
        _;
    }
    
    constructor() public {
        moderator = msg.sender;
    }
    
    address public moderator;
    mapping (address => Course) public courses;
    mapping (address => Dispute[]) public disputes;
    
    function teacher_ready_to_give_lesson(uint price, address student, address author, uint duration) public {
        require(!is_blocked(msg.sender));
        require(price != 0);
        require(duration <= 60 * 60 * 3 && duration > 0);
        
        courses[msg.sender] = Course({
            student: student,
            price: price,
            blocked: false,
            author: author,
            duration: duration,
            start: 0
        });
        
        emit LessonPrepared(msg.sender);
    }
    
    function student_start_lesson(address teacher) public is_student(teacher) payable {
        require(!is_blocked(teacher), "Course is blocked");
        require(courses[teacher].price == msg.value, "Invalid amount");
        
        courses[teacher].blocked = true;
        courses[teacher].start = now;
    
        emit LessonStarted(teacher, now + courses[teacher].duration);
    }
    
    function student_end_lesson(bool is_ok, address teacher) public is_student(teacher) {
        require(!is_expired(teacher) && is_blocked(teacher));
        
        if (is_ok) {
            require(teacher.send(courses[teacher].price));
        }
        else {
            disputes[teacher].push(Dispute({
                student: msg.sender,
                author: courses[teacher].author,
                price: courses[teacher].price
            }));
            
            emit DisputeMade(teacher, disputes[teacher].length);
        }
        
        clear_course(teacher);
    }
    
    function clear_course(address teacher) private {
        courses[teacher].blocked = false;
        courses[teacher].student = address(0);
    }
    
    function withdraw_expired() public {
        require(is_expired(msg.sender) && is_blocked(msg.sender));
        msg.sender.send(courses[msg.sender].price);
        clear_course(msg.sender);
    }

    function resolve_dispute(address teacher, bool teacher_is_right, uint i) public is_moderator() {
        require(disputes[teacher][i].student != 0, "There is no dispute related to this teacher");
        
        if (teacher_is_right) {
            require(teacher.send(disputes[teacher][i].price), "Unable to send");
        }
        else {
            require(disputes[teacher][i].student.send(disputes[teacher][i].price), "Unable to send");   
        }
        
        disputes[teacher][i].student = address(0);
        emit DisputeResolved(teacher, courses[teacher].student, courses[teacher].price, teacher_is_right);
    }
}
